/**
 * @component PageHero
 * @description 页面顶部全宽战术横幅：青绿战场氛围背景（网格 + 扫描光带 + 武器剪影装饰）+ 图标 + 标题 + 副标题
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-24
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
  /** 右侧装饰武器剪影图路径（public 下的透明底 png，可选） */
  decoImage?: string;
}

export default function PageHero({ title, subtitle, icon, decoImage }: PageHeroProps) {
  return (
    /* mx 负 margin 全宽突破内容容器（需 body overflow-x-hidden 配合），还原设计稿全宽横幅 */
    <section className="relative mx-[calc(50%-50vw)] mb-7 overflow-hidden border-b border-accent/25 bg-panel/40">
      {/* 氛围层 1：右深左暗的青绿渐变底 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, #0a0f15 30%, rgba(13,34,29,0.92) 62%, rgba(15,52,43,0.92) 100%)',
        }}
        aria-hidden="true"
      />
      {/* 氛围层 2：战术网格（左侧渐隐） */}
      <div
        className="absolute inset-0 bg-grid"
        style={{ maskImage: 'linear-gradient(90deg, black 20%, transparent 75%)' }}
        aria-hidden="true"
      />
      {/* 氛围层 3：斜向扫描光带 */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(105deg, transparent 42%, rgba(47,227,164,0.07) 54%, transparent 66%)',
        }}
        aria-hidden="true"
      />
      {/* 氛围层 4：右侧武器剪影（青绿调 + 左向渐隐遮罩 + 光晕） */}
      {decoImage && (
        <img
          src={decoImage}
          alt=""
          aria-hidden="true"
          className="absolute right-0 top-1/2 h-[170%] max-w-none -translate-y-1/2 object-contain opacity-40"
          style={{
            maskImage: 'linear-gradient(90deg, transparent 0%, black 48%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 48%)',
            filter: 'drop-shadow(0 0 26px rgba(47,227,164,0.35)) brightness(1.05)',
          }}
        />
      )}

      {/* 内容（与页面主容器对齐） */}
      <div className="relative mx-auto flex max-w-[1200px] items-center gap-5 px-4 py-8">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-accent/50 bg-gradient-to-br from-accent/30 to-accent/5 text-accent shadow-[0_0_26px_rgba(47,227,164,0.32)]">
          {icon}
        </span>
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold tracking-wide title-glow">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-muted">{subtitle}</p>}
        </div>
      </div>

      {/* 底边青绿辉光分割线 */}
      <div className="absolute bottom-0 left-0 h-px w-1/3 bg-gradient-to-r from-accent via-accent/40 to-transparent" aria-hidden="true" />
    </section>
  );
}
