/**
 * 游戏中常量映射（口径贴图 / 品阶配色 / 改装配件槽位名）
 * 说明：口径图标文件名真源为同为 constants 目录的 caliber-icons.json，sync 脚本共用同一份数据，
 *       新增口径只需补一行 JSON，避免前端与脚本两份映射漂移。
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-26
 */

import CALIBER_ICON_FILES from '@/constants/caliber-icons.json';
import type { AmmoEffectKey, AmmoRow } from '@/types/ammo';

/** 口径 -> 本地弹药贴图路径（playerhub 官方贴图，按口径区分） */
export const CALIBER_ICON: Record<string, string> = Object.fromEntries(
  Object.entries(CALIBER_ICON_FILES as Record<string, string>).map(([caliber, file]) => [
    caliber,
    `/img/ammo/${file}.png`,
  ])
);

/** 品阶主题色变量，索引 = 品阶 - 1（红品阶 / 穿 6 起为专属弹，单独取 --danger）；对外请用 tierColor() */
const TIER_COLORS = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)'] as const;

/** 品阶 Tailwind 文字色类，索引 = 品阶 - 1，与 TIER_COLORS 一一对应；对外请用 tierTextClass() */
const TIER_TEXT_CLASS = ['text-t1', 'text-t2', 'text-t3', 'text-t4', 'text-t5'] as const;

/** 品阶 Tailwind 左侧描边类，索引 = 品阶 - 1；对外请用 tierBorderClass() */
const TIER_BORDER_CLASS = [
  'border-l-t1',
  'border-l-t2',
  'border-l-t3',
  'border-l-t4',
  'border-l-t5',
] as const;

/** 品阶原始名 -> 展示标签（橙 / 金同属金色品阶） */
export const RARITY_LABEL: Record<string, string> = {
  白: '白弹',
  绿: '绿弹',
  蓝: '蓝弹',
  紫: '紫弹',
  橙: '金弹',
  金: '金弹',
  红: '专属弹',
};

/**
 * 品阶取值归一：越界 / 缺省（专属弹 tier 为 null）时回退到白弹，避免下标 -1 取到 undefined
 * @param tier - 品阶 1-5
 * @returns 归一后的索引（0-4）
 */
function tierIndex(tier: number | null | undefined): number {
  if (!tier || tier < 1) return 0;
  return Math.min(tier, TIER_COLORS.length) - 1;
}

/**
 * 品阶 -> 主题色变量
 * @param tier - 品阶 1-5，null 表示专属弹
 * @returns CSS 颜色值
 */
export function tierColor(tier: number | null | undefined): string {
  return TIER_COLORS[tierIndex(tier)];
}

/**
 * 品阶 -> Tailwind 文字色类名
 * @param tier - 品阶 1-5，null 表示专属弹
 * @returns 类名，如 text-t3
 */
export function tierTextClass(tier: number | null | undefined): string {
  return TIER_TEXT_CLASS[tierIndex(tier)];
}

/**
 * 品阶 -> Tailwind 左侧描边类名
 * @param tier - 品阶 1-5，null 表示专属弹
 * @returns 类名，如 border-l-t3
 */
export function tierBorderClass(tier: number | null | undefined): string {
  return TIER_BORDER_CLASS[tierIndex(tier)];
}

/**
 * 是否专属弹（红品阶，或穿 6/7 的重武器专属弹）
 * @description 单一判定口径：矩阵页标记、弹药库配色与品阶筛选必须共用，避免上游新增
 *              「非红品阶但穿 6」的弹种后出现「矩阵标专属、筛选归常规」的错位
 * @param ammo - 至少包含品阶 / 品阶名 / 穿透等级的弹药
 * @returns 是否专属弹
 */
export function isExclusiveAmmo(
  ammo: Pick<AmmoRow, 'tier' | 'rarity' | 'pen_level'>
): boolean {
  return ammo.pen_level >= 6 || ammo.rarity === '红';
}

/**
 * 弹药主色：专属弹统一取危险色，其余按品阶取色
 * @param ammo - 至少包含品阶 / 品阶名 / 穿透等级的弹药
 * @returns CSS 颜色值
 */
export function ammoColor(ammo: Pick<AmmoRow, 'tier' | 'rarity' | 'pen_level'>): string {
  return isExclusiveAmmo(ammo) ? 'var(--danger)' : tierColor(ammo.tier);
}

/** 弹药命中特效 -> 徽章配色（燃烧金橙 / 爆裂红），弹药库与武器详情共用 */
export const AMMO_EFFECT_TONE: Record<AmmoEffectKey, string> = {
  burn: 'var(--t5)',
  detonation: 'var(--danger)',
};

/** 改装槽位编号 -> 中文槽位名 */
export const SLOT_NAMES: Record<string, string> = {
  '1': '瞄具',
  '2': '枪口',
  '3': '枪管',
  '4': '护木',
  '5': '弹匣',
  '6': '枪托',
  '8': '前握把',
  '10': '后握把',
  '11': '导轨',
  '14': '功能性配件',
  '17': '侧导轨',
  '19': '机匣盖',
  '20': '战术灯',
  '31': '枪口下挂',
  '32': '弹鼓',
  '34': '拉机柄',
  '35': '上导轨',
  '38': '枪管下导轨',
  '40': '枪口附件',
  '44': '下挂榴弹',
  '45': '枪带环',
  '50': '通用导轨',
};
