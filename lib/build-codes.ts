/**
 * 改枪码读取与补全（构建期 + 运行时共用）
 * @description 数据真源为运行时数据库 data/builds.db（见 lib/builds-db），
 *              constants/build-codes.json 退化为首次播种的种子与人工备份。本模块负责：
 *              1. 按枪名 / 别名把方案关联到 weapons 表，补齐图片、口径与类别；
 *              2. 过滤非法记录并留下日志，避免脏数据让整页渲染失败。
 *              面板参数不在改枪码模块重复展示（统一由武器图鉴承载）；
 *              改枪码不进 delta.db，sync 重建数据库不会覆盖已录入的内容。
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27（数据源由静态 JSON 改为运行时 builds.db）
 */

import ALIAS_FILE from '@/constants/weapon-aliases.json';
import { BUILD_SCENARIOS, normalizeBuildTags } from '@/constants/build-code';
import { getBuildsUpdatedAt, listBuildRecords } from '@/lib/builds-db';
import { getAllWeapons } from '@/lib/db';
import { normalizeWeaponName, shortWeaponName } from '@/lib/weapon-name';
import type { BuildCodeRecord, BuildCodeView, BuildWeaponOption } from '@/types/build-code';
import type { WeaponRow } from '@/types/weapon';

/** 别名 -> 官方枪名（键为归一后的别名，来自 constants/weapon-aliases.json） */
const ALIAS_TO_NAME: Record<string, string> = Object.entries(
  ALIAS_FILE as Record<string, string[]>
).reduce<Record<string, string>>((acc, [official, aliases]) => {
  for (const alias of aliases) acc[normalizeWeaponName(alias)] = official;
  return acc;
}, {});

/**
 * 把方案里的枪名解析为数据库武器行
 * @param query - 记录中的 weapon 字段（数据库枪名 / 简称 / 玩家别名）
 * @param weapons - 全量武器行
 * @returns 命中的武器行；未收录返回 null
 */
function resolveWeapon(query: string, weapons: WeaponRow[]): WeaponRow | null {
  const key = normalizeWeaponName(query);
  if (!key) return null;

  // 1. 枪名（含简称）直接命中
  const byName = weapons.find((w) => normalizeWeaponName(w.name) === key);
  if (byName) return byName;

  // 2. 玩家口语 / 英文别名
  const official = ALIAS_TO_NAME[key];
  if (official) {
    const byAlias = weapons.find((w) => normalizeWeaponName(w.name) === normalizeWeaponName(official));
    if (byAlias) return byAlias;
  }

  // 3. 兜底包含匹配（如「腾龙」→「腾龙突击步枪（QBZ-191）」），避免简称漏配
  return weapons.find((w) => normalizeWeaponName(w.name).includes(key)) ?? null;
}

/**
 * 校验并归一单条记录
 * @param record - 原始记录
 * @returns 归一后的记录；必填字段缺失或场景非法时返回 null
 * @description 同时供写入接口复用，保证「入库」与「读取」走同一套口径
 */
export function normalizeRecord(record: BuildCodeRecord): BuildCodeRecord | null {
  if (!record || typeof record.id !== 'string' || !record.id.trim()) return null;
  if (typeof record.weapon !== 'string' || !record.weapon.trim()) return null;
  if (typeof record.code !== 'string' || !record.code.trim()) return null;
  const scenario = BUILD_SCENARIOS.find((item) => item.value === record.scenario)?.value;
  if (!scenario) return null;

  // 标签先取出再归一：手写的空串 / 重复 / 超长项在这里就被清掉，导出时不会带脏数据
  const { tags: rawTags, ...rest } = record;
  const tags = normalizeBuildTags(rawTags);

  return {
    ...rest,
    id: record.id.trim(),
    weapon: record.weapon.trim(),
    code: record.code.trim(),
    scenario,
    // 无标签时不写空数组，保持数据文件干净
    ...(tags.length > 0 ? { tags } : {}),
  };
}

/**
 * 读取全部合法记录（不含武器解析，供录入页与写接口使用）
 * @returns 按写入顺序排列的记录；非法记录跳过并打印日志
 */
export function getBuildCodeRecords(): BuildCodeRecord[] {
  const records: BuildCodeRecord[] = [];
  const usedIds = new Set<string>();

  for (const raw of listBuildRecords()) {
    const record = normalizeRecord(raw);
    if (!record) {
      console.warn('[build-codes] 记录缺少必填字段（id / weapon / scenario / code），已跳过', raw);
      continue;
    }
    if (usedIds.has(record.id)) {
      console.warn(`[build-codes] 方案 id 重复：${record.id}，已跳过后出现的记录`);
      continue;
    }
    usedIds.add(record.id);
    records.push(record);
  }

  return records;
}

/**
 * 读取全部改枪码方案（构建期一次性解析）
 * @returns 按数据文件顺序排列的方案展示模型；数据文件为空或武器表缺失时降级返回
 */
export function getBuildCodes(): BuildCodeView[] {
  // 武器表只读一次：方案数量增长到几百条也不会造成 N+1
  let weapons: WeaponRow[] = [];
  try {
    weapons = getAllWeapons();
  } catch (error) {
    // 缺库时仍展示方案文字与改枪码，只是没有图片
    console.warn('[build-codes] 武器表读取失败，方案降级为纯文字展示', error);
  }

  const result: BuildCodeView[] = [];

  for (const record of getBuildCodeRecords()) {
    const weapon = resolveWeapon(record.weapon, weapons);
    if (!weapon) {
      console.warn(
        `[build-codes] 未匹配到武器「${record.weapon}」（方案 ${record.id}），请检查枪名或 constants/weapon-aliases.json`
      );
    }

    const price =
      typeof record.price === 'number' && Number.isFinite(record.price) && record.price >= 0
        ? record.price
        : null;

    result.push({
      id: record.id,
      // 无方案名时用武器简称兜底（去掉官方型号后缀），避免标题与副标题完全重复
      title: record.title?.trim() || shortWeaponName(weapon?.name ?? record.weapon),
      scenario: record.scenario,
      weapon: weapon
        ? {
            id: weapon.id,
            name: weapon.name,
            category: weapon.category,
            caliber: weapon.caliber,
            image: weapon.image,
          }
        : null,
      weaponName: weapon?.name ?? record.weapon,
      price,
      code: record.code,
      featured: record.featured === true,
      createdAt: record.createdAt?.trim() ?? '',
      note: record.note?.trim() ?? '',
      tags: normalizeBuildTags(record.tags),
    });
  }

  return result;
}

/**
 * 读取录入页的武器下拉数据
 * @description 只下发图鉴基础字段（枪名 / 类别 / 口径 / 图片）；面板参数由武器图鉴页承载，
 *              改枪码录入不再重复维护数值
 * @returns 按数据库展示顺序排列的武器项；缺库时返回空数组（录入仍可手填枪名）
 */
export function getBuildWeaponOptions(): BuildWeaponOption[] {
  try {
    return getAllWeapons().map((weapon) => ({
      id: weapon.id,
      name: weapon.name,
      shortName: shortWeaponName(weapon.name),
      category: weapon.category,
      caliber: weapon.caliber,
      image: weapon.image,
    }));
  } catch (error) {
    console.warn('[build-codes] 武器表读取失败，录入页下拉为空', error);
    return [];
  }
}

/** 改枪码收录概览（首页入口卡片用，不触达数据库） */
export interface BuildCodeSummary {
  /** 方案总数 */
  total: number;
  /** 各场景方案数，未收录的场景为 0 */
  byScenario: Record<string, number>;
  /** 数据最后整理日期，缺省为空串 */
  updatedAt: string;
}

/**
 * 读取改枪码概览
 * @description 只读数据文件，不查武器表：首页只需要数量，避免为一张入口卡片多开一次数据库查询
 * @returns 方案总数 / 分场景数量 / 整理日期
 */
export function getBuildCodeSummary(): BuildCodeSummary {
  const byScenario: Record<string, number> = {};
  for (const item of BUILD_SCENARIOS) byScenario[item.value] = 0;

  const records = getBuildCodeRecords();
  for (const record of records) {
    byScenario[record.scenario] = (byScenario[record.scenario] ?? 0) + 1;
  }

  return { total: records.length, byScenario, updatedAt: getBuildsUpdatedAt() };
}
