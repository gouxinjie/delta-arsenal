/**
 * 全局路由进度状态（跳转中 / 空闲）
 * @description App Router 没有 routeChangeStart 事件，且页面 RSC 均为同步渲染，
 *              `app/loading.tsx` 只会在服务端开始返回之后才出现——开发环境编译或网络等待期间是空窗。
 *              因此这里用模块级订阅在「点击瞬间」置位，等主内容区真正刷新（见 RouteProgress）时复位，
 *              让顶部进度条对 <Link> 点击、前进后退、router.push 三类入口都能立刻响应。
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */
'use client';

import { useSyncExternalStore } from 'react';

/** 是否处于跳转中（模块级单例，全站共享一份） */
let navigating = false;

/** 订阅者集合（目前只有 RouteProgress 组件） */
const subscribers = new Set<() => void>();

/**
 * 通知所有订阅者状态变化
 * @returns 无
 */
function notify(): void {
  subscribers.forEach((fn) => fn());
}

/**
 * 标记一次跳转开始；已在跳转中则忽略，避免重复渲染
 * @returns 无
 */
export function startRouteProgress(): void {
  if (navigating) return;
  navigating = true;
  notify();
}

/**
 * 标记跳转结束（收起进度条）
 * @returns 无
 */
export function completeRouteProgress(): void {
  if (!navigating) return;
  navigating = false;
  notify();
}

/**
 * 读取当前是否处于跳转中（供 DOM 观察者在回调里判断，避免闭包拿到过期值）
 * @returns 是否正在跳转
 */
export function isRouteProgressPending(): boolean {
  return navigating;
}

/**
 * 订阅全局跳转状态
 * @returns 是否正在跳转；服务端快照恒为 false，避免水合不一致
 */
export function useRouteProgress(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      subscribers.add(onStoreChange);
      return () => {
        subscribers.delete(onStoreChange);
      };
    },
    () => navigating,
    () => false
  );
}
