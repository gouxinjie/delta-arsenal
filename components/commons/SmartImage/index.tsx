/**
 * @component SmartImage
 * @description 本地静态图统一兜底：地址为空或加载失败时渲染调用方给定的占位内容。
 *              此前口径贴图 / 武器卡片图 / 弹药磁贴各写一套 onError，表现不一致（消失 / 剪影 / 破图）。
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */
'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';

/** SmartImage 组件入参 */
interface SmartImageProps {
  /** 图片地址；空串表示无图，直接渲染 fallback */
  src: string;
  /** 替代文本（无图场景由 fallback 承担语义，此处仍用于可访问性） */
  alt: string;
  /** 图片样式类，如尺寸 / 定位 */
  className?: string;
  /** 无图或加载失败时的占位内容，默认不渲染任何内容 */
  fallback?: ReactNode;
  /** 是否懒加载，默认 true（首屏关键图可传 false） */
  lazy?: boolean;
}

export default function SmartImage({
  src,
  alt,
  className,
  fallback = null,
  lazy = true,
}: SmartImageProps) {
  /**
   * 记录加载失败的地址（而不是布尔值）：
   * 列表复用组件实例时 src 变化可自动恢复，无需额外 effect 重置
   */
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) return <>{fallback}</>;

  return (
    <img
      src={src}
      alt={alt}
      loading={lazy ? 'lazy' : undefined}
      // 异步解码：切换模块时几十张武器图同时入场，同步解码会长时间占住主线程造成卡顿
      decoding="async"
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}
