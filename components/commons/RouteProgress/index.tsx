/**
 * @component RouteProgress
 * @description 全局跳转进度条：站内链接点击 / 浏览器前进后退 / 编程式 router.push 时立刻在顶部出现，
 *              等主内容区真正刷新（DOM 变化）后收起。
 *              收尾不用 pathname 判断——它会先于内容更新；也不依赖模板挂载时机。
 *              否则进度条会在「旧页面静止等待」的关键几秒里提前消失，等于没有反馈。
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  completeRouteProgress,
  isRouteProgressPending,
  startRouteProgress,
  useRouteProgress,
} from '@/hooks/useRouteProgress';

/** 兜底收起时长：路由提交信号丢失时避免进度条常驻 */
const FALLBACK_MS = 8000;

export default function RouteProgress() {
  const navigating = useRouteProgress();
  const pathname = usePathname();
  /** 最近一次记录到的路径，供 popstate 判断是否发生了整页跳转 */
  const lastPathname = useRef(pathname);
  /** 主内容区上一次已知文本，用于判断 DOM 变化是否真的换了页面 */
  const lastTextRef = useRef('');

  // 只记录路径：pathname 会先于内容更新，不能当作「页面已就绪」的信号
  useEffect(() => {
    lastPathname.current = pathname;
  }, [pathname]);

  // 跳转入口 1：站内 <a> 点击（捕获阶段，早于 Link 自身的冒泡处理，点击瞬间即可响应）
  // 跳转入口 2：浏览器前进 / 后退（popstate 触发时 location 已是目标地址，与已记录路径比较）
  useEffect(() => {
    /**
     * 判断一次点击是否构成整页路由跳转
     * @param event - 鼠标点击事件
     * @returns 需要显示进度条时返回 true
     */
    const isRouteNavigation = (event: MouseEvent): boolean => {
      if (event.defaultPrevented || event.button !== 0) return false;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
      const target = event.target;
      if (!(target instanceof Element)) return false;
      const anchor = target.closest('a[href]');
      if (!(anchor instanceof HTMLAnchorElement)) return false;
      // 新窗口 / 下载 / 页内锚点都不产生路由跳转
      if (anchor.target && anchor.target !== '_self') return false;
      if (anchor.hasAttribute('download')) return false;
      const raw = anchor.getAttribute('href');
      if (!raw || raw.startsWith('#')) return false;
      let url: URL;
      try {
        url = new URL(raw, window.location.href);
      } catch {
        return false;
      }
      if (url.origin !== window.location.origin) return false;
      // 同路径的 query / hash 变化由页面自身即时响应（如弹药抽屉），不显示整页进度条
      return url.pathname !== window.location.pathname;
    };

    const onClick = (event: MouseEvent): void => {
      if (isRouteNavigation(event)) startRouteProgress();
    };
    const onPopState = (): void => {
      if (window.location.pathname !== lastPathname.current) startRouteProgress();
    };

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  // 提交信号：主内容区文本发生变化即代表新页面已渲染（含 loading 骨架先落地的情况）。
  // 只认文本变化而不是任意 DOM 变化：图片兜底、局部节点替换这类与路由无关的变更会造成误收尾。
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    lastTextRef.current = main.textContent ?? '';
    const observer = new MutationObserver(() => {
      const node = document.querySelector('main');
      if (!node) return;
      const text = node.textContent ?? '';
      if (!isRouteProgressPending()) {
        lastTextRef.current = text;
        return;
      }
      if (text === lastTextRef.current) return;
      lastTextRef.current = text;
      completeRouteProgress();
    });
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // 兜底：异常情况下主内容区迟迟没有变化，超时强制收起
  useEffect(() => {
    if (!navigating) return;
    const timer = setTimeout(completeRouteProgress, FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [navigating]);

  if (!navigating) return null;

  return (
    <div
      role="progressbar"
      aria-label="页面加载中"
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] overflow-hidden bg-accent/35"
    >
      <div className="route-bar h-full w-full" />
    </div>
  );
}
