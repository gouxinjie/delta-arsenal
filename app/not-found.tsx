/**
 * @page NotFound
 * @description 全站 404 页：替代 Next 默认英文页，提供返回各模块入口
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

import Link from 'next/link';
import { IconUnknown } from '@/components/commons/icons';

export const metadata = { title: '页面不存在' };

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center py-10 text-center">
      <span className="text-muted/40" aria-hidden="true">
        <IconUnknown className="h-14 w-14" />
      </span>
      <h1 className="mt-4 text-xl font-bold tracking-wide">页面不存在</h1>
      <p className="num mt-1.5 text-[13px] text-muted">ERROR 404 · 该型号未收录</p>
      <p className="mt-3 max-w-[420px] text-sm leading-relaxed text-muted">
        你访问的地址可能已失效，或该武器 / 弹药尚未入库。可以从下面的入口继续检索。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/ammo/matrix"
          className="rounded-md bg-accent px-4 py-2 text-[13px] font-bold tracking-wide text-[color:var(--on-accent)] transition-all [box-shadow:var(--box-glow)] hover:brightness-110"
        >
          进入穿甲矩阵
        </Link>
        <Link
          href="/ammo"
          className="rounded-md border border-edge bg-panel/50 px-4 py-2 text-[13px] text-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          浏览弹药库
        </Link>
        <Link
          href="/weapons"
          className="rounded-md border border-edge bg-panel/50 px-4 py-2 text-[13px] text-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          武器图鉴
        </Link>
      </div>
    </div>
  );
}
