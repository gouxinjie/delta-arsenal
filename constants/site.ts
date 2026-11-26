/**
 * 站点级共享常量（跨客户端组件与首屏脚本共用的字面量，避免多处硬编码漂移）
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

/** localStorage 中保存主题的键名：layout 首屏防闪脚本与 ThemeToggle 必须共用这一份 */
export const THEME_STORAGE_KEY = 'delta-theme';

/** 站点根地址：构建期由 NEXT_PUBLIC_SITE_URL 注入（SSG 需绝对 URL），缺省回退本地端口 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
