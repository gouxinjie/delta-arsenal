/**
 * 站点级展示类型（跨服务端组件与页脚共用的数据结构）
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

/** 收录数量统计；数据库缺失时字段为 null，由 UI 渲染为「—」而非伪造数字 */
export interface SiteCounts {
  /** 弹药条数 */
  ammo: number | null;
  /** 武器条数 */
  weapons: number | null;
}

/**
 * 站点元信息（构建期一次性解析，供布局 / 页脚 / 首页共用）
 * @description 全部字段已做兜底，数据库缺失时不会抛错
 */
export interface SiteMeta {
  /** meta 表原始键值对（透传给需要自定义字段的调用方） */
  meta: Record<string, string>;
  /** 收录数量统计 */
  counts: SiteCounts;
  /** 赛季标签，缺省为「—」 */
  season: string;
  /** 上游数据集版本，未知时为空串 */
  datasetVersion: string;
  /** 数据同步日期（zh-CN 格式），缺省为「—」 */
  updatedAt: string;
  /** meta.sources 原始 JSON 字符串，供首页解析数据来源 */
  sourcesRaw: string;
}
