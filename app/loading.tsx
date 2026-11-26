/**
 * @page Loading
 * @description 路由级加载骨架：模块切换时 Next 立即渲染此骨架，
 *              不让用户在等待 RSC 数据的这段时间里看着旧页面「点了没反应」。
 *              骨架结构与页面真实布局（PageHero + 数据区）保持一致，切换完成时视觉跳动最小。
 * @author gouxinjie
 * @created 2026-11-26
 */

/**
 * 路由加载骨架
 * @returns 页头骨架 + 数据区骨架（纯静态结构，无任何客户端逻辑）
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* 顶部不确定进度条：给用户「请求已发出」的即时信号 */}
      <div className="route-bar mb-4 h-[2px] w-full overflow-hidden rounded bg-edge/60" aria-hidden="true" />

      {/* 页头骨架：对齐 PageHero 的图标 + 标题 + 副标题三行结构 */}
      <div className="mb-4 flex items-start gap-3">
        <div className="sk h-10 w-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <div className="sk h-5 w-40 max-w-[60%]" />
          <div className="sk h-3.5 w-full max-w-[520px]" />
        </div>
      </div>

      {/* 数据区骨架：左侧筛选栏 + 右侧分组面板 */}
      <div className="flex flex-col gap-4 md:flex-row md:gap-5">
        <div className="sk hidden h-[300px] w-48 shrink-0 md:block" />
        <div className="min-w-0 flex-1 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-edge/60">
              <div className="sk h-9 w-full opacity-60" />
              <div className="space-y-2 p-3">
                <div className="sk h-4 w-full" />
                <div className="sk h-4 w-11/12" />
                <div className="sk h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">页面加载中…</span>
    </div>
  );
}
