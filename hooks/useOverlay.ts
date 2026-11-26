/**
 * 弹层通用行为 Hook（抽屉 / 搜索弹窗共用）
 * @description 统一处理：背景滚动锁定（含滚动条宽度补偿）、Esc 关闭、Tab 焦点陷阱、关闭后焦点归还。
 *              集中一处实现，避免每个弹层各写一遍且行为不一致。
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */

import { useEffect, useRef } from 'react';

/** 可聚焦元素选择器（排除 disabled 与 tabindex=-1） */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 为弹层提供无障碍与滚动锁定能力
 * @param active - 弹层是否处于打开态（关闭动画期间可继续为 true，保持滚动锁定）
 * @param onClose - 关闭回调（Esc 触发），需保证引用稳定
 * @returns 需要挂到弹层根元素上的 ref，元素应带 tabindex="-1" 以便聚焦
 */
export function useOverlay<T extends HTMLElement>(active: boolean, onClose: () => void) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!active) return;
    const container = ref.current;
    /** 打开前聚焦的元素，关闭后归还焦点 */
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // 锁定背景滚动：滚动条消失会让可用宽度变大，补同宽 padding 防止内容横向抖动
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    // 焦点移入弹层容器本身（不抢第一个链接，避免滚动位置被跳走）
    container?.focus({ preventScroll: true });

    /** 收集当前可聚焦元素 */
    const focusables = (): HTMLElement[] =>
      container ? Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];

    /** Esc 关闭 + Tab 焦点循环 */
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !container) return;
      const items = focusables();
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      const current = document.activeElement;
      // 焦点已跑到弹层外（或被浏览器移出）：拉回弹层内
      if (!container.contains(current)) {
        event.preventDefault();
        firstItem.focus();
        return;
      }
      if (event.shiftKey && (current === firstItem || current === container)) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && current === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [active, onClose]);

  return ref;
}
