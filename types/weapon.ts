/**
 * 武器前端类型定义（图鉴卡片与详情抽屉共用）
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-25
 */

import type { AmmoEffects } from '@/types/ammo';

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

/** 详情抽屉内展示的可用弹药摘要 */
export interface WeaponAmmoBrief {
  /** 弹药 itemID */
  id: string;
  /** 弹药型号名 */
  name: string;
  /** 口径 */
  caliber: string;
  /** 品阶 1-5，专属弹可能为 null */
  tier: number | null;
  /** 穿透等级 0-7 */
  pen_level: number;
  /** 肉体伤害倍率 */
  dmg_ratio: number;
  /** 命中特效（构建期由 effects JSON 解析而来），无特效为空对象 */
  effects?: AmmoEffects;
  /** 是否赛季限定（1=是） */
  season_limited: number;
}

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
}
