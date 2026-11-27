/**
 * @component Header
 * @description 全站顶部导航栏：三角形 LOGO、主导航（青绿辉光选中态）、移动端二级导航、全局搜索入口
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-25
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchDialog from '@/components/commons/SearchDialog';
import ThemeToggle from '@/components/commons/ThemeToggle';

/** 主导航项配置 */
const NAV = [
  { href: '/ammo/matrix', label: '穿甲对照' },
  { href: '/ammo', label: '弹药库' },
  { href: '/weapons', label: '武器图鉴' },
  { href: '/builds', label: '改枪码' },
  { href: '/about', label: '关于' },
];

export default function Header() {
  const pathname = usePathname();
  /**
   * 判断导航项是否为当前页
   * @param href - 导航项路径
   * @returns 路径精确等于 href，或位于其子路径下且没有更具体的导航项可归属时为 true
   */
  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (!pathname.startsWith(`${href}/`)) return false;
    // 子路径已被更具体的导航项覆盖时（如 /ammo/matrix 归"穿甲对照"），不再高亮当前项
    return !NAV.some(
      (n) => n.href !== href && (pathname === n.href || pathname.startsWith(`${n.href}/`))
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-bg/85 backdrop-blur-md">
      <div className="max-w-[1200px] mx-auto px-3 sm:px-4 h-14 flex items-center gap-2.5 sm:gap-6">
        {/* LOGO：青绿渐变三角（三角洲军徽意象）+ 站名（小屏压缩字号与字距，避免挤占操作区） */}
        <Link href="/" prefetch className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
          <svg
            viewBox="0 0 32 32"
            className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-105"
            style={{ filter: 'drop-shadow(0 0 12px var(--logo-glow))' }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="logo-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--logo-a)" />
                <stop offset="100%" stopColor="var(--logo-b)" />
              </linearGradient>
            </defs>
            <path d="M16 3 L30 28 H2 Z" fill="url(#logo-grad)" />
            <path d="M16 12 L23.5 25 H8.5 Z" fill="var(--bg)" />
          </svg>
          <span className="font-bold tracking-[0.1em] sm:tracking-[0.16em] text-[14px] sm:text-[15px]">
            三角洲<span className="text-accent">军械库</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              // prefetch：四个模块均为静态页，RSC 负载仅数十 KB；
              // 显式完整预取后点击即可命中客户端缓存，切换不再等待网络往返
              prefetch
              className={`relative px-3 py-1.5 rounded transition-colors ${
                isActive(n.href) ? 'text-accent nav-glow' : 'text-muted hover:text-main'
              }`}
            >
              <span className="relative">{n.label}</span>
              {isActive(n.href) && (
                <span className="absolute bottom-0 inset-x-1 h-[2px] bg-accent rounded nav-line" aria-hidden="true" />
              )}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <ThemeToggle />
          <SearchDialog />
        </div>
      </div>

      {/* 移动端二级导航：单行横向滚动，不折行占高 */}
      <nav
        aria-label="主导航（移动端）"
        className="md:hidden flex gap-1.5 px-3 sm:px-4 pb-2 text-[13px] overflow-x-auto"
      >
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            prefetch
            className={`px-2.5 sm:px-3 py-1 rounded border whitespace-nowrap transition-colors ${
              isActive(n.href) ? 'border-accent text-accent nav-glow' : 'border-edge text-muted'
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
