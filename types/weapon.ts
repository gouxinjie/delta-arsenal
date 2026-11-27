/**
 * 武器类型定义（数据库行 / 前端展示模型 / 统计字段）
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-26
 */

import type { AmmoEffects, AmmoRow } from '@/types/ammo';

/** 武器面板参数（源数据字段可能缺省，缺省时按 '—' 展示） */
export interface WeaponPanel {
  /** 肉体伤害 */
  meatHarm?: number;
  /** 护甲伤害 */
  armorHarm?: number;
  /** 射速（发/分） */
  fireRate?: number;
  /** 有效射程（米） */
  effectiveRange?: number;
  /** 后坐力控制 */
  recoil?: number;
  /** 操控速度 */
  control?: number;
  /** 武器稳定性 */
  stability?: number;
  /** 腰射精度 */
  hipFire?: number;
  /** 枪口初速（米/秒） */
  muzzleVelocity?: number;
  /** 弹匣容量 */
  magSize?: number;
  /** 枪声传播距离（米） */
  soundRadius?: number;
  /** 开火模式列表 */
  fireModes?: string[];
}

/**
 * 面板中的数值字段键
 * @description 排除 fireModes（字符串数组），用于进度条 / 最大值统计等数值场景
 */
export type WeaponNumericKey = Exclude<keyof WeaponPanel, 'fireModes'>;

/**
 * 武器数据行（data/delta.db weapons 表，JSON 字段保持字符串原样）
 * @description 行类型集中定义在此，lib/db 只负责查询
 */
export interface WeaponRow {
  /** 武器 objectID */
  id: string;
  /** 武器名 */
  name: string;
  /** 类别 */
  category: string;
  /** 口径 */
  caliber: string;
  /** 本地图片路径 */
  image: string;
  /** 面板 JSON 字符串 */
  panel: string;
  /** 可改装槽位 JSON 数组字符串 */
  slots: string;
  /** 数据来源标记 */
  source: string;
  /** 是否赛季实战榜热门（1 热门 / 0 非热门，由 sync 按榜单 T0 口径写入） */
  is_hot: number;
  /** 社区分级 1-4（0 表示未定级，页面不展示徽标；真源见 constants/weapon-grades.json） */
  grade: number;
}

/** 详情抽屉内展示的可用弹药摘要（由 AmmoRow 裁剪而来，避免重复声明字段） */
export type WeaponAmmoBrief = Pick<
  AmmoRow,
  'id' | 'name' | 'caliber' | 'tier' | 'rarity' | 'pen_level' | 'dmg_ratio' | 'season_limited'
> & {
  /** 命中特效（构建期由 effects JSON 解析而来），无特效为空对象 */
  effects: AmmoEffects;
};

/** 武器完整展示模型（图鉴卡片 + 详情抽屉） */
export interface WeaponDetail {
  /** 武器 objectID */
  id: string;
  /** 武器名称 */
  name: string;
  /** 类别（步枪/冲锋枪等） */
  category: string;
  /** 口径 */
  caliber: string;
  /** 本地图片路径 */
  image: string;
  /** 面板参数 */
  panel: WeaponPanel;
  /** 可改装槽位编号列表 */
  slots: string[];
  /** 可用弹药 */
  ammo: WeaponAmmoBrief[];
  /** 是否赛季实战榜热门武器（图鉴卡片展示 🔥 角标） */
  hot: boolean;
  /** 社区分级 1-4（0 表示未定级，不展示「N 级枪」徽标） */
  grade: number;
}
