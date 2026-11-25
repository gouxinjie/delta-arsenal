/**
 * 弹药类型定义（命中特效 / 表格展示共用）
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-25
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

/** 特效摘要（表格标签 + 悬浮说明） */
export interface AmmoEffectSummary {
  /** 特效类型标识 */
  key: 'burn' | 'detonation';
  /** 徽章标题，如「燃烧」 */
  label: string;
  /** 表格内一行简述 */
  brief: string;
  /** 完整参数说明（悬浮提示 / 详情抽屉） */
  detail: string;
}
