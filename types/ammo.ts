/**
 * 弹药类型定义（数据库行 / 命中特效 / 穿甲矩阵 / 前端展示模型）
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-26
 */

/** 燃烧特效参数（命中后持续掉血） */
export interface BurnEffect {
  /** 燃烧总持续时间（毫秒） */
  durationMs: number;
  /** 每跳结算间隔（毫秒） */
  intervalMs: number;
  /** 每层每跳造成的伤害 */
  damagePerStack: number;
  /** 最大叠加层数 */
  maxStacks: number;
  /** 刷新策略：independentLayers=每次命中独立成层，wholeGroup=整组刷新 */
  refreshPolicy: string;
  /** 溢出策略：rejectNew=满层后不再新增 */
  overflowPolicy: string;
}

/** 延迟爆裂特效参数（命中后延迟引爆） */
export interface DetonationEffect {
  /** 引爆延迟（毫秒） */
  durationMs: number;
  /** 爆炸肉体伤害 */
  damage: number;
  /** 爆炸护甲伤害 */
  armorDamage: number;
  /** 爆炸判定穿透等级 */
  penetrationLevel: number;
  /** 爆炸影响半径（米） */
  radiusMeters: number;
  /** 满伤害半径（米） */
  fullRadiusMeters: number;
  /** 边缘最低伤害 */
  minimumDamage: number;
  /** 最大叠加层数（叠满后引爆） */
  maxStacks: number;
  /** 各阶段引爆所需层数 */
  stageStackCounts: number[];
  /** 引爆后是否清空层数 */
  clearOnDetonate: boolean;
  /** 刷新策略 */
  refreshPolicy: string;
}

/** 弹药命中特效集合（对应源数据 on_hit_effects，无特效时为空对象） */
export interface AmmoEffects {
  /** 燃烧特效 */
  burn?: BurnEffect;
  /** 延迟爆裂特效 */
  detonation?: DetonationEffect;
}

/** 命中特效类型标识 */
export type AmmoEffectKey = 'burn' | 'detonation';

/** 特效摘要（表格标签 + 悬浮说明） */
export interface AmmoEffectSummary {
  /** 特效类型标识 */
  key: AmmoEffectKey;
  /** 徽章标题，如「燃烧」 */
  label: string;
  /** 表格内一行简述 */
  brief: string;
  /** 完整参数说明（悬浮提示 / 详情抽屉） */
  detail: string;
}

/**
 * 弹药数据行（data/delta.db ammo 表，JSON 字段保持字符串原样）
 * @description 行类型集中定义在此，lib/db 只负责查询，避免前端组件反向自定义一份同名字段
 */
export interface AmmoRow {
  /** 弹药 itemID */
  id: string;
  /** 型号名 */
  name: string;
  /** 口径 */
  caliber: string;
  /** 品阶 1-5，专属弹可能为 null */
  tier: number | null;
  /** 品阶中文名 */
  rarity: string;
  /** 穿透等级 0-7 */
  pen_level: number;
  /** 肉体伤害倍率 */
  dmg_ratio: number;
  /** 护甲伤害倍率 */
  armor_ratio: number;
  /** 穿透矩阵 JSON 字符串 */
  matrix: string;
  /** 命中特效 JSON 字符串（燃烧 / 延迟爆裂，无特效为 {}） */
  effects: string;
  /** 是否赛季限定（1=是） */
  season_limited: number;
  /** 弹药备注：限定弹标注赛季，特殊弹标注机制，可为空串 */
  note: string;
}

/** 弹药关联武器简要信息（弹药详情抽屉展示枪械缩略图用） */
export interface AmmoWeaponBrief {
  /** 武器 objectID（用于跳转 /weapons/[id]） */
  id: string;
  /** 武器名 */
  name: string;
  /** 本地图片路径，空串表示该枪无官方图 */
  image: string;
}

/** 穿透矩阵单元格（源数据 penetration_matrix 的一个护甲等级条目） */
export interface MatrixCell {
  /** 命中身体后保留的生命值伤害比例（0~1） */
  body_health_rate?: number;
  /** 命中头部后保留的生命值伤害比例（0~1） */
  helmet_health_rate?: number;
  /** 源数据是否判定可穿透 */
  penetrates?: boolean;
}

/** 穿透矩阵：键为护甲等级字符串（'1'~'6'） */
export type PenetrationMatrix = Record<string, MatrixCell>;

/**
 * 弹药前端展示模型
 * @description 构建期已解析 effects、聚合适用枪械，运行时无需再处理 JSON
 */
export interface AmmoView extends Omit<AmmoRow, 'effects' | 'matrix'> {
  /** 命中特效（已解析），无特效为空对象 */
  effects: AmmoEffects;
  /** 适用枪械名（顿号分隔），无关联为空串 */
  weaponNames: string;
  /** 适用枪械明细（含图片），无关联为空数组 */
  weapons: AmmoWeaponBrief[];
}
