/**
 * 武器面板字段的展示配置
 * @description 字段文案（卡片短标签 / 抽屉完整标签 / 单位）与展示顺序只在这里定义一份；
 *              图鉴卡片与详情抽屉此前各写一套，同字段出现「肉伤 / 基础伤害」两个名字。
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

import type { WeaponNumericKey } from '@/types/weapon';

/** 单个面板字段的展示配置 */
export interface WeaponStatMeta {
  /** 完整标签（抽屉等宽裕场景） */
  label: string;
  /** 紧凑标签（卡片 8 项平铺） */
  short: string;
  /** 数值单位，无单位省略 */
  unit?: string;
}

/** 面板数值字段的展示配置（键为 WeaponPanel 的数值字段） */
export const WEAPON_STAT_META: Record<WeaponNumericKey, WeaponStatMeta> = {
  meatHarm: { label: '基础伤害', short: '肉伤' },
  armorHarm: { label: '护甲伤害', short: '甲伤' },
  fireRate: { label: '射速', short: '射速', unit: '/分钟' },
  effectiveRange: { label: '优势射程', short: '射程', unit: '米' },
  recoil: { label: '后坐力控制', short: '后座' },
  control: { label: '操控速度', short: '操控' },
  stability: { label: '武器稳定性', short: '稳定' },
  hipFire: { label: '腰射精度', short: '腰射' },
  muzzleVelocity: { label: '枪口初速', short: '初速', unit: '/秒' },
  magSize: { label: '弹匣容量', short: '容量' },
  soundRadius: { label: '枪声传播距离', short: '声距', unit: '米' },
};

/** 图鉴卡片参数栏：8 项等宽平铺（对齐参考图排版） */
export const WEAPON_CARD_STAT_KEYS: readonly WeaponNumericKey[] = [
  'meatHarm',
  'armorHarm',
  'fireRate',
  'effectiveRange',
  'recoil',
  'control',
  'stability',
  'hipFire',
];

/** 详情抽屉「核心性能」：带进度条，数值按全库最大值等比填充 */
export const WEAPON_BAR_STAT_KEYS: readonly WeaponNumericKey[] = [
  'meatHarm',
  'effectiveRange',
  'recoil',
  'control',
  'stability',
  'hipFire',
];

/** 详情抽屉「其它参数」行顺序（fireModes 为字符串数组，渲染时单独拼接） */
export const WEAPON_VALUE_ROW_KEYS: readonly (WeaponNumericKey | 'fireModes')[] = [
  'armorHarm',
  'fireRate',
  'magSize',
  'fireModes',
  'muzzleVelocity',
  'soundRadius',
];

/**
 * 武器类别展示顺序
 * @description 图鉴分类 Tab 与「全部」列表排序共用这一份顺序：此前 Tab 是手写数组、
 *              列表用 SQL 的二进制排序，两者顺序不一致（列表按 冲锋枪→手枪→步枪 排）。
 *              新增类别只改这里；未登记的类别在列表末尾兜底。
 */
export const WEAPON_CATEGORY_ORDER: readonly string[] = [
  '步枪',
  '冲锋枪',
  '精确射手步枪',
  '狙击步枪',
  '轻机枪',
  '霰弹枪',
  '手枪',
  '特殊武器',
];
