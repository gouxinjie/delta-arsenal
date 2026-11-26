/**
 * @component Drawer
 * @description 通用右侧抽屉外壳：遮罩 + 面板 + 关闭按钮 + 入场动效，
 *              无障碍行为（滚动锁定 / Esc / 焦点陷阱 / 焦点归还）复用 useOverlay。
 *              弹药详情与武器详情此前各写一套外壳，遮罩强度与动效机制已经出现分叉。
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */
'use client';

import type { ReactNode } from 'react';
import { useOverlay } from '@/hooks/useOverlay';

/** Drawer 组件入参 */
interface DrawerProps {
  /** 是否打开；关闭即卸载（动效为 CSS 入场动画，与弹药抽屉既有行为一致） */
  open: boolean;
  /** 关闭回调（遮罩点击、Esc、关闭按钮共用） */
  onClose: () => void;
  /** 无障碍标签，形如「M4A1 详情」 */
  ariaLabel: string;
  /** 抽屉内容，由调用方保证 open 为 true 时数据完整 */
  children: ReactNode;
  /** 面板宽度与额外样式类，默认右侧 384px */
  panelClassName?: string;
  /** 遮罩强度：strong=详情浏览（强压暗），soft=轻量抽屉 */
  overlay?: 'strong' | 'soft';
}

export default function Drawer({
  open,
  onClose,
  ariaLabel,
  children,
  panelClassName = 'sm:w-96',
  overlay = 'strong',
}: DrawerProps) {
  // 打开期间锁定背景滚动 + Esc 关闭 + 焦点陷阱 + 关闭后焦点归还
  const panelRef = useOverlay<HTMLElement>(open, onClose);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩：点击关闭；强 / 弱两档由调用方按信息密度选择 */}
      <div
        className={`absolute inset-0 anim-fade ${
          overlay === 'strong' ? 'bg-[color:var(--overlay)]' : 'bg-[color:var(--overlay-soft)]'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 面板：右侧滑入；关闭按钮统一由外壳提供，内容区右上角需留白避让 */}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        className={`absolute right-0 top-0 flex h-dvh w-full max-w-full flex-col border-l border-edge bg-panel anim-slide outline-none [box-shadow:var(--drawer-shadow)] ${panelClassName}`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭详情"
          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full text-xl leading-none text-muted transition-colors hover:bg-panel-hi hover:text-accent"
        >
          ×
        </button>
        {children}
      </aside>
    </div>
  );
}
