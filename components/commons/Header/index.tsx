/**
 * @component Header
 * @description 全站顶部导航栏：LOGO、主导航（含当前页高亮下划线）、移动端二级导航、全局搜索入口
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-23
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchDialog from '@/components/commons/SearchDialog';

/** 主导航项配置 */
const NAV = [
  { href: '/ammo/matrix', label: '穿甲对照' },
  { href: '/ammo', label: '弹药库' },
  { href: '/weapons', label: '武器图鉴' },
  { href: '/about', label: '关于' },
];

export default function Header() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/ammo/matrix' ? pathname === href : pathname.startsWith(href) && href !== '/ammo/matrix';

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-bg/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-7">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="flex flex-col gap-[3px] group-hover:gap-[5px] transition-all">
            <span className="w-4 h-[2px] bg-accent" />
            <span className="w-3 h-[2px] bg-accent/60" />
            <span className="w-2 h-[2px] bg-accent/30" />
          </span>
          <span className="font-bold tracking-[0.18em] text-[15px]">
            三角洲<span className="text-accent">军械库</span>
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-3 py-1.5 rounded transition-colors relative ${
                isActive(n.href) ? 'text-accent' : 'text-muted hover:text-main'
              }`}
            >
              {n.label}
              {isActive(n.href) && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-accent rounded" />}
            </Link>
          ))}
        </nav>
        <div className="ml-auto">
          <SearchDialog />
        </div>
      </div>
      <nav className="md:hidden flex gap-1.5 px-4 pb-2 text-sm overflow-x-auto">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`px-3 py-1 rounded border whitespace-nowrap transition-colors ${
              isActive(n.href) ? 'border-accent text-accent' : 'border-edge text-muted'
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
