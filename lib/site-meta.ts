/**
 * 站点元信息读取（构建期）
 * @description meta 表的解析、计数兜底与版本字段归一集中在此：
 *              布局 / 页脚 / 首页三处共用一份口径，避免各写一遍「解析 counts → 判 null」。
 *              站点元信息属可降级数据（缺库时页面仍可渲染骨架），业务数据不在此兜底。
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

import { getMeta } from '@/lib/db';
import { formatDate } from '@/lib/format';
import type { SiteCounts, SiteMeta } from '@/types/site';

/**
 * 解析 meta.counts（JSON 字符串）
 * @param raw - meta.counts 原始值
 * @returns 计数对象，非法字段一律置 null
 */
function parseCounts(raw: string | undefined): SiteCounts {
  const empty: SiteCounts = { ammo: null, weapons: null };
  if (!raw) return empty;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return empty;
    const value = parsed as { ammo?: unknown; weapons?: unknown };
    return {
      ammo: typeof value.ammo === 'number' ? value.ammo : null,
      weapons: typeof value.weapons === 'number' ? value.weapons : null,
    };
  } catch (error) {
    console.warn('[site-meta] counts 解析失败，按无数据渲染', error);
    return empty;
  }
}

/**
 * 读取站点元信息
 * @returns 已兜底的元信息对象；数据库缺失时各字段回退到占位值
 */
export function getSiteMeta(): SiteMeta {
  let meta: Record<string, string> = {};
  try {
    meta = getMeta();
  } catch (error) {
    // 数据文件缺失：页面渲染骨架，不阻塞构建
    console.warn('[site-meta] meta 读取失败，页面降级为骨架', error);
  }

  return {
    meta,
    counts: parseCounts(meta.counts),
    season: meta.season ?? '—',
    // 上游数据集版本（如 20261105-weiguang.1），用于判断本站数据是否落后于当前赛季
    datasetVersion:
      meta.datasetVersion && meta.datasetVersion !== 'unknown' ? meta.datasetVersion : '',
    updatedAt: formatDate(meta.generatedAt),
    sourcesRaw: meta.sources ?? '',
  };
}
