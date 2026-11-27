/**
 * 数据库行 -> 前端展示模型转换（构建期执行）
 * @description 弹药 / 武器的字段裁剪与 JSON 字段解析只有这一份实现，
 *              页面只负责取数，不再各自手写 map（此前 ammo / weapons / 详情页三处重复）。
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

import { parseAmmoEffects } from '@/lib/ammo-effects';
import { parseJson } from '@/lib/json';
import { SLOT_NAMES } from '@/constants/game';
import { WEAPON_BAR_STAT_KEYS } from '@/constants/weapon';
import type { AmmoRow, AmmoView, AmmoWeaponBrief } from '@/types/ammo';
import type { WeaponAmmoBrief, WeaponDetail, WeaponNumericKey, WeaponPanel, WeaponRow } from '@/types/weapon';

/**
 * 弹药行 -> 详情抽屉用的弹药摘要
 * @param row - 弹药数据行
 * @returns 仅保留抽屉需要的字段，并解析命中特效
 */
export function toWeaponAmmoBrief(row: AmmoRow): WeaponAmmoBrief {
  return {
    id: row.id,
    name: row.name,
    caliber: row.caliber,
    tier: row.tier,
    rarity: row.rarity,
    pen_level: row.pen_level,
    dmg_ratio: row.dmg_ratio,
    effects: parseAmmoEffects(row.effects),
    season_limited: row.season_limited,
  };
}

/**
 * 弹药行 -> 弹药库展示模型
 * @param row - 弹药行（含聚合出的适用枪械名）
 * @param weapons - 该弹药关联的武器明细（含图片），无关联传空数组
 * @returns 展示模型；矩阵与原始 effects 字符串不下发客户端
 */
export function toAmmoView(
  row: AmmoRow & { weaponNames: string },
  weapons: AmmoWeaponBrief[]
): AmmoView {
  return {
    id: row.id,
    name: row.name,
    caliber: row.caliber,
    tier: row.tier,
    rarity: row.rarity,
    pen_level: row.pen_level,
    dmg_ratio: row.dmg_ratio,
    armor_ratio: row.armor_ratio,
    season_limited: row.season_limited,
    note: row.note,
    weaponNames: row.weaponNames,
    effects: parseAmmoEffects(row.effects),
    weapons,
  };
}

/**
 * 解析武器面板 JSON
 * @param raw - weapons.panel 原始值
 * @returns 面板对象，损坏时返回空对象（卡片全部渲染「—」）
 */
export function parseWeaponPanel(raw: string | null | undefined): WeaponPanel {
  return parseJson<WeaponPanel>(raw, {});
}

/**
 * 解析武器槽位 JSON
 * @param raw - weapons.slots 原始值
 * @returns 槽位编号数组，损坏或非数组时返回空数组
 */
export function parseWeaponSlots(raw: string | null | undefined): string[] {
  const parsed = parseJson<unknown>(raw, []);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
}

/**
 * 槽位芯片：同一槽位名合并计数
 * @description 护木上的导轨挂载点是多个独立编号但同名（如 M4A1 有 6 个「导轨」），
 *              逐个罗列会得到一屏重复标签，这里按名称合并并给出数量
 */
export interface SlotChip {
  /** 原始槽位编号（合并后取首个，用作 React key） */
  key: string;
  /** 槽位名；字典未登记的编号回退为「槽位 N」 */
  label: string;
  /** 该名称下的槽位数量 */
  count: number;
}

/**
 * 槽位编号数组 -> 展示用芯片
 * @param slots - 槽位编号数组（weapons.slots 解析结果）
 * @returns 按首次出现顺序排列的芯片数组
 */
export function toSlotChips(slots: string[]): SlotChip[] {
  const groups = new Map<string, SlotChip>();
  for (const id of slots) {
    const label = SLOT_NAMES[id] ?? `槽位 ${id}`;
    const hit = groups.get(label);
    if (hit) {
      hit.count += 1;
      continue;
    }
    groups.set(label, { key: id, label, count: 1 });
  }
  return [...groups.values()];
}

/**
 * 武器行 -> 图鉴 / 详情展示模型
 * @param row - 武器数据行
 * @param ammo - 该武器可用弹药行，无关联传空数组
 * @returns 完整展示模型
 */
export function toWeaponDetail(row: WeaponRow, ammo: AmmoRow[]): WeaponDetail {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    caliber: row.caliber,
    image: row.image,
    panel: parseWeaponPanel(row.panel),
    slots: parseWeaponSlots(row.slots),
    ammo: ammo.map(toWeaponAmmoBrief),
  };
}

/**
 * 计算进度条刻度：各面板字段在全库中的最大值
 * @description 图鉴抽屉与武器详情页都需要同一套刻度，口径统一在这里，避免两处各算一份
 * @param panels - 全库武器的面板对象
 * @returns 字段 -> 最大值；全库都没有该字段时不返回对应键（调用方按 0 处理）
 */
export function computeStatMax(panels: WeaponPanel[]): Partial<Record<WeaponNumericKey, number>> {
  const max: Partial<Record<WeaponNumericKey, number>> = {};
  for (const panel of panels) {
    for (const key of WEAPON_BAR_STAT_KEYS) {
      const value = panel[key];
      if (typeof value === 'number') max[key] = Math.max(max[key] ?? 0, value);
    }
  }
  return max;
}
