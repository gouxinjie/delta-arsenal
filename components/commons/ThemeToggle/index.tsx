/**
 * @component ThemeToggle
 * @description 主题切换按钮：浅色（默认）↔ 暗黑，选择结果写入 localStorage，刷新后保持
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-25
 */
'use client';

import { THEME_STORAGE_KEY } from '@/constants/site';

export default function ThemeToggle() {
  /**
   * 切换主题：读取 <html data-theme> 当前值取反，同步写回 DOM 与本地存储
   * @returns 无
   */
  const toggleTheme = (): void => {
    const root = document.documentElement;
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // 隐私模式 / 禁用存储时忽略，仅本次会话生效
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="切换深色 / 浅色主题"
      title="切换深色 / 浅色主题"
      className="theme-toggle w-8 h-8 shrink-0 flex items-center justify-center rounded-md border border-edge text-muted hover:text-accent hover:border-accent/60 transition-colors"
    >
      {/* 月亮：暗色主题下作为「当前主题」标识 */}
      <svg
        className="icon-moon w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z" />
      </svg>
      {/* 太阳：浅色主题下作为「当前主题」标识 */}
      <svg
        className="icon-sun w-4 h-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
