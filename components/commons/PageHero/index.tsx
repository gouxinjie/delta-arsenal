/**
 * @component PageHero
 * @description 页面顶部全宽战术横幅：主题化氛围背景（渐变 + 网格 + 扫描光带 + 右侧柔光）+ 图标 + 标题 + 副标题，
 *              可选在右侧放置页面级主操作（如「录入改枪码」按钮）
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-27
 */
import type { ReactNode } from 'react';

/** PageHero 组件入参 */
interface PageHeroProps {
  /** 页面主标题 */
  title: string;
  /** 副标题（可包含彩色关键词等 ReactNode） */
  subtitle?: ReactNode;
  /** 左侧图标（建议 24px 左右的 SVG） */
  icon: ReactNode;
  /**
   * 右侧页面级主操作（可交互元素，需为客户端组件）
   * @default undefined 不渲染操作区
   * @description 桌面端与标题同行右对齐；窄屏自动折到副标题下方并占满一行
   */
  actions?: ReactNode;
}

export default function PageHero({ title, subtitle, icon, actions }: PageHeroProps) {
  return (
    /* mx 负 margin 全宽突破内容容器（需 body overflow-x-hidden 配合），还原设计稿全宽横幅 */
    <section
      className="relative mx-[calc(50%-50vw)] mb-4 overflow-hidden border-b border-accent/25 bg-panel/40"
      aria-labelledby="page-hero-title"
    >
      {/* 氛围层 1：主题化渐变底（暗色为深青绿，浅色为白→淡青绿） */}
      <div className="absolute inset-0" style={{ background: 'var(--hero-bg)' }} aria-hidden="true" />
      {/* 氛围层 2：战术网格（右侧渐隐，避免干扰标题与副标题阅读） */}
      <div
        className="absolute inset-0 bg-grid"
        style={{ maskImage: 'linear-gradient(90deg, black 10%, transparent 80%)' }}
        aria-hidden="true"
      />
      {/* 氛围层 3：斜向扫描光带 */}
      <div className="absolute inset-0" style={{ background: 'var(--hero-sweep)' }} aria-hidden="true" />
      {/* 氛围层 4：右侧柔光（替代原武器剪影，平衡左重右空的版面） */}
      <div
        className="pointer-events-none absolute -right-24 top-1/2 h-[360px] w-[360px] -translate-y-1/2 rounded-full bg-accent/[0.07] blur-3xl"
        aria-hidden="true"
      />

      {/* 内容（与页面主容器对齐）：flex-wrap 让操作区在窄屏折到下一行 */}
      <div className="relative mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-3 px-4 py-5 sm:gap-x-5 sm:py-8">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-accent/50 bg-gradient-to-br from-accent/30 to-accent/5 text-accent [box-shadow:var(--box-glow)] sm:h-14 sm:w-14">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h1
            id="page-hero-title"
            className="text-balance text-[22px] font-bold tracking-wide title-glow sm:text-[26px] lg:text-[28px]"
          >
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-[760px] text-pretty text-[13px] leading-[1.7] text-muted sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="w-full shrink-0 sm:ml-auto sm:w-auto">{actions}</div>}
      </div>

      {/* 底边青绿辉光分割线 */}
      <div className="absolute bottom-0 left-0 h-px w-1/3 bg-gradient-to-r from-accent via-accent/40 to-transparent" aria-hidden="true" />
    </section>
  );
}
