/**
 * 数据库 JSON 文本安全解析
 * @description 库里 JSON 字段（panel / slots / matrix / effects / counts）由 sync 生成，
 *              仍按「外部输入」对待：任一字段损坏只降级该字段，不应让整站构建失败。
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

/**
 * 安全解析 JSON 字符串
 * @param raw - 原始文本，可能为 null / 空串 / 非法 JSON
 * @param fallback - 解析失败或为空时的兜底值
 * @returns 解析结果或兜底值；仅保证不抛错，字段合法性由调用方校验
 */
export function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    return (parsed ?? fallback) as T;
  } catch (error) {
    // 数据损坏必须留下痕迹，否则会表现为「页面静默缺数据」
    console.warn('[json] 字段解析失败，使用兜底值', error);
    return fallback;
  }
}
