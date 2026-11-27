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

/**
 * 哈夫币金额转「万」文本
 * @description 卡片上的总价一律按万展示（23 万 / 25.8 万），整万不带小数，
 *              避免 1,180,000 这类长数字在标题行里挤掉方案名
 * @param price - 金额（哈夫币），null 表示未标注
 * @returns 形如「23万」的文本；null 或非法值返回「—」
 */
export function formatPriceWan(price: number | null): string {
  if (price === null || !Number.isFinite(price) || price < 0) return '—';
  const wan = price / 10000;
  // 整万直接取整（23），非整万保留一位（25.8），避免 25.0000001 之类的浮点尾巴
  return `${Number.isInteger(wan) ? wan : wan.toFixed(1)}万`;
}

/**
 * 生成今天的日期（YYYY-MM-DD，按运行环境本地时区）
 * @description 改枪码录入表单的默认日期：在服务端生成后下发，
 *              避免客户端时区与服务端不同导致水合前后输入框值不一致
 * @returns 形如 `2026-11-27` 的日期字符串
 */
export function formatTodayDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}
