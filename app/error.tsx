/**
 * @page Error
 * @description 全局错误边界：捕获渲染异常并记录日志，提供重试与回首页入口
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * 错误页入参（由 Next.js 注入）
 */
interface ErrorPageProps {
  /** 捕获到的错误对象 */
  error: Error & { digest?: string };
  /** 重置错误边界并重新渲染当前路由 */
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  // 错误必须落日志，便于上线后排查（生产环境不会自动打印到控制台）
  useEffect(() => {
    console.error('[app] 页面渲染异常', error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center py-10 text-center">
      <h1 className="text-xl font-bold tracking-wide">页面加载失败</h1>
      <p className="num mt-1.5 text-[13px] text-muted">ERROR 500 · 数据渲染出错</p>
      <p className="mt-3 max-w-[460px] text-sm leading-relaxed text-muted">
        页面在渲染数据时出现异常。可先重试；若持续失败，说明本地数据文件可能损坏，请重新执行
        <code className="num mx-1 rounded border border-edge bg-panel-hi px-1.5 py-0.5 text-[12px] text-main">
          pnpm run sync
        </code>
        重建数据库。
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-[13px] font-bold tracking-wide text-[color:var(--on-accent)] transition-all [box-shadow:var(--box-glow)] hover:brightness-110"
        >
          重试
        </button>
        <Link
          href="/"
          className="rounded-md border border-edge bg-panel/50 px-4 py-2 text-[13px] text-muted transition-colors hover:border-accent/50 hover:text-accent"
        >
          返回首页
        </Link>
      </div>
      {error.digest && <p className="num mt-4 text-[11px] text-muted/60">错误标记：{error.digest}</p>}
    </div>
  );
}
