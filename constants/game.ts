/**
 * 游戏中常量映射（口径贴图 / 品阶配色 / 改装配件槽位名）
 * 说明：口径图标文件名真源为同为 constants 目录的 caliber-icons.json，
 *       改装槽位名真源为 constants/slot-names.json（sync 脚本共用同一份数据），
 *       新增口径或槽位只需补一行 JSON，避免前端与脚本两份映射漂移。
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-27
 */

import CALIBER_ICON_FILES from '@/constants/caliber-icons.json';
import SLOT_NAME_FILES from '@/constants/slot-names.json';
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

/**
 * 改装槽位编号 -> 中文槽位名
 * @description 键为游戏内 `slotID` / `socket_id`（两个数据源同一套编号空间，已用「同武器槽位集合
 *              互为子集 + AWM 专属件 22 号槽两源一致」交叉验证）。旧表按 UI 展示顺序填写编号，
 *              与真实 slotID 错位（如 1 写成「瞄具」、11 写成「导轨」），已按下列证据逐条更正：
 *              - tierlist `sockets[].options` 的真实配件名（如 1 号槽全是「XX 后握把」、11 号槽全是瞄准镜）
 *              - tierlist `attribute_rules`（2 号槽影响初速/射程 = 枪管，4 号槽影响腰射散布 = 护木）
 *              - DFD 配件 JSON 的 `secondClassCN`（弹匣 / 前握把 / 瞄具等）
 *              17/19/20/32/34/35 的可选件均为枪灯、镭指、护木片，同属护木上的导轨挂载点。
 *              真源为 constants/slot-names.json（sync 依据它裁剪补充源槽位），不要在此重复维护。
 *              未登记的编号由使用方回退为「槽位 N」，不要凭猜测补条目。
 */
export const SLOT_NAMES: Record<string, string> = SLOT_NAME_FILES as Record<string, string>;
