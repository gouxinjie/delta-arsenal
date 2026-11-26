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
