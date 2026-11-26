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
import type { AmmoRow, AmmoView, AmmoWeaponBrief } from '@/types/ammo';
import type { WeaponAmmoBrief, WeaponDetail, WeaponPanel, WeaponRow } from '@/types/weapon';

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
