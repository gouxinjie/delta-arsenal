/**
 * 展示层格式化工具（纯函数，服务端与客户端通用）
 * @description 全站唯一的数字 / 百分比 / 日期格式化入口，避免各页面各写一份且兜底口径不同
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

/**
 * 数量展示：null 统一渲染为「—」，不把「无数据」显示成 0
 * @param value - 计数值或 null
 * @returns 展示文本
 */
export function formatCount(value: number | null): string {
  return value === null ? '—' : String(value);
}

/**
 * 伤害倍率转百分比文本
 * @param ratio - 倍率（0.75 表示 75%）
 * @returns 百分比文本，非法数值返回「—」
 */
export function formatPercent(ratio: number): string {
  return Number.isFinite(ratio) ? `${Math.round(ratio * 100)}%` : '—';
}

/**
 * ISO 时间转本地日期文本
 * @param iso - ISO 时间字符串，可能为空或非法
 * @returns zh-CN 日期文本，缺省/非法返回「—」
 */
export function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('zh-CN');
}
