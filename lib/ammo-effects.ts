/**
 * 弹药命中特效摘要生成（纯函数，服务端与客户端通用）
 * 数据来源：tierlist ammo.json 的 on_hit_effects，经 sync 写入 ammo.effects（JSON 字符串）
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-25
 */

import type { AmmoEffectSummary, AmmoEffects, BurnEffect, DetonationEffect } from '@/types/ammo';

/** 刷新策略 -> 中文说明 */
const REFRESH_LABEL: Record<string, string> = {
  independentLayers: '每次命中独立成层',
  wholeGroup: '整组叠加刷新',
};

/** 溢出策略 -> 中文说明 */
const OVERFLOW_LABEL: Record<string, string> = {
  rejectNew: '满层后不再叠加',
};

/**
 * 毫秒转秒，整秒去掉小数位
 * @param ms - 毫秒数
 * @returns 秒数字符串，如 3300 -> '3.3'，3000 -> '3'
 */
function toSeconds(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0';
  return String(Number((ms / 1000).toFixed(1)));
}

/**
 * 生成燃烧特效摘要
 * @param e - 燃烧参数
 * @returns 特效摘要
 */
function describeBurn(e: BurnEffect): AmmoEffectSummary {
  const seconds = toSeconds(e.durationMs);
  // 结算跳数：向下取整，3.3 秒 / 1 秒 = 3 跳
  const ticks = e.intervalMs > 0 ? Math.max(1, Math.floor(e.durationMs / e.intervalMs)) : 1;
  const refresh = REFRESH_LABEL[e.refreshPolicy] ?? e.refreshPolicy;
  const overflow = OVERFLOW_LABEL[e.overflowPolicy] ?? e.overflowPolicy;
  return {
    key: 'burn',
    label: '燃烧',
    brief: `${seconds}s × ${ticks}跳 · ${e.maxStacks}层`,
    detail:
      `持续燃烧 ${seconds} 秒（每 ${toSeconds(e.intervalMs)} 秒结算 1 跳，共 ${ticks} 跳），` +
      `每层每跳 ${e.damagePerStack} 点伤害，最多 ${e.maxStacks} 层；${refresh}，${overflow}。`,
  };
}

/**
 * 生成延迟爆裂特效摘要
 * @param e - 爆裂参数
 * @returns 特效摘要
 */
function describeDetonation(e: DetonationEffect): AmmoEffectSummary {
  const seconds = toSeconds(e.durationMs);
  return {
    key: 'detonation',
    label: '爆裂',
    brief: `${seconds}s 后爆炸 · ${e.damage}伤`,
    detail:
      `命中后 ${seconds} 秒引爆：${e.damage} 点肉体伤害 + ${e.armorDamage} 点护甲伤害` +
      `（按穿甲 ${e.penetrationLevel} 级判定），爆炸半径 ${e.radiusMeters} 米，` +
      `中心 ${e.fullRadiusMeters} 米内满伤，边缘最低 ${e.minimumDamage} 点。`,
  };
}

/**
 * 生成弹药特效摘要列表
 * @param effects - 特效对象（源数据 on_hit_effects）
 * @returns 摘要数组；无特效时返回空数组
 */
export function describeAmmoEffects(effects?: AmmoEffects | null): AmmoEffectSummary[] {
  if (!effects) return [];
  const list: AmmoEffectSummary[] = [];
  if (effects.burn) list.push(describeBurn(effects.burn));
  if (effects.detonation) list.push(describeDetonation(effects.detonation));
  return list;
}

/**
 * 安全解析库中 effects 字段（JSON 字符串）
 * @param raw - 数据库 effects 列原始值，可能为 null / 空串 / 非法 JSON
 * @returns 解析后的特效对象，异常时返回空对象
 */
export function parseAmmoEffects(raw: string | null | undefined): AmmoEffects {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as AmmoEffects) : {};
  } catch {
    return {};
  }
}
