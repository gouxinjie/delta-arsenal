/**
 * @component SectionTitle
 * @description 分区标题：左侧青绿竖条 + 标题 + 计数徽章 + 右侧可选操作位；
 *              武器详情抽屉与武器详情页此前各写一套，视觉口径统一到这里
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */
import type { ReactNode } from 'react';

/** SectionTitle 组件入参 */
interface SectionTitleProps {
  /** 标题文案 */
  title: string;
  /** 右侧计数徽章，缺省不渲染 */
  count?: number;
  /** 标题标签层级：抽屉内为 h3，整页分区为 h2，默认 h3 */
  as?: 'h2' | 'h3';
  /** 右侧追加内容（如「查看全部 →」链接），缺省不渲染 */
  extra?: ReactNode;
}

export default function SectionTitle({ title, count, as = 'h3', extra }: SectionTitleProps) {
  const Heading = as;
  return (
    <Heading className="flex items-center gap-2 text-[13px] font-semibold text-accent mb-3">
      <span className="w-1 h-3.5 rounded-sm bg-accent [box-shadow:var(--tab-glow)]" aria-hidden="true" />
      {title}
      {count !== undefined && (
        <span className="num px-1.5 py-0.5 rounded text-[10px] font-normal text-muted bg-bg border border-edge/70">
          {count}
        </span>
      )}
      {extra && <span className="ml-auto text-[11px] font-normal text-muted">{extra}</span>}
    </Heading>
  );
}
