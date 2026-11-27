/**
 * @page Builds
 * @description 改枪码页：烽火地带 / 全面战场的玩家改枪方案，按价格排序并支持一键复制；
 *              数据来自运行时数据库 data/builds.db（人工录入），渲染时关联武器图鉴的图片与口径
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27（改为 ISR：录入后接口 revalidatePath 立即刷新）
 */

import BuildCodeBrowser from '@/components/commons/BuildCodeBrowser';
import BuildCodeEntry from '@/components/commons/BuildCodeEntry';
import PageHero from '@/components/commons/PageHero';
import { IconWrench } from '@/components/commons/icons';
import { BUILD_SCENARIOS } from '@/constants/build-code';
import { formatDate, formatTodayDate } from '@/lib/format';
import {
  getBuildCodeRecords,
  getBuildCodeSummary,
  getBuildCodes,
  getBuildWeaponOptions,
} from '@/lib/build-codes';

export const metadata = {
  title: '改枪码',
  description:
    '三角洲行动改枪码大全：烽火地带主流改枪方案，含改装总价与面板数值，一键复制进游戏载入。非官方玩家整理，随版本更新可能失效。',
};

/**
 * 页面缓存策略
 * @description 录入接口写入后会调用 revalidatePath 立即失效，这里的 60 秒只是兜底：
 *              防止漏掉失效调用时数据长期不更新
 */
export const revalidate = 60;

export default function BuildsPage() {
  // 方案与统计在渲染时算好并缓存 60 秒：客户端只负责筛选与复制
  const builds = getBuildCodes();
  const summary = getBuildCodeSummary();
  // 抽屉内录入器所需数据：渲染时一次性取好随页面下发，打开抽屉不再请求接口
  const weapons = getBuildWeaponOptions();
  const existing = getBuildCodeRecords();
  const scenarioText = BUILD_SCENARIOS.map(
    (item) => `${item.label} ${summary.byScenario[item.value] ?? 0} 套`
  ).join(' · ');

  return (
    <div>
      <PageHero
        title="改枪码"
        icon={<IconWrench className="h-6 w-6" />}
        actions={
          <BuildCodeEntry weapons={weapons} existing={existing} defaultDate={formatTodayDate()} />
        }
        subtitle={
          <>
            收录玩家整理的 <b className="num text-accent">{summary.total}</b> 套改枪方案（
            {scenarioText}），按改装总价排序，点击卡片底部即可复制改枪码。
            <span className="mt-1 block text-[11px] text-muted">
              改枪码为非官方玩家分享，版本更新后可能失效；价格随赛季行情浮动，仅供参考。
              本站方案来自站内实测与公开攻略整理，卡片标注改装总价、玩法标签与手感备注。
            </span>
          </>
        }
      />

      <BuildCodeBrowser builds={builds} />

      {/* 使用说明：交代复制后的操作路径与免责口径 */}
      <section
        className="tac-panel tac-panel-plain mt-4 rounded-xl p-4 sm:p-6"
        aria-labelledby="builds-usage-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="builds-usage-title"
            className="flex items-center gap-2 text-[13px] font-semibold tracking-wide text-accent"
          >
            <span className="h-3.5 w-[3px] rounded-sm bg-accent" aria-hidden="true" />
            怎么用
          </h2>
          <span className="num text-[10px] tracking-[0.2em] text-muted/50">
            {summary.updatedAt ? `整理于 ${formatDate(summary.updatedAt)}` : '持续整理中'}
          </span>
        </div>

        <ol className="mt-1 grid gap-2.5 text-[12px] leading-relaxed text-muted sm:grid-cols-3 sm:gap-4">
          <li className="rounded-md border border-edge/60 bg-panel-hi/40 p-2.5">
            <b className="num mr-1.5 text-accent">01</b>
            在方案卡片底部点「复制改枪码」，整串代码（枪名 + 场景 + 编码）会写入剪贴板。
          </li>
          <li className="rounded-md border border-edge/60 bg-panel-hi/40 p-2.5">
            <b className="num mr-1.5 text-accent">02</b>
            进入游戏改装台，打开方案 / 预设面板，粘贴改枪码即可载入整套配件。
          </li>
          <li className="rounded-md border border-edge/60 bg-panel-hi/40 p-2.5">
            <b className="num mr-1.5 text-accent">03</b>
            面板数值为改装后参考值，未标注增减值的方案沿用武器原厂数据，以游戏内实测为准。
          </li>
        </ol>

        <p className="mt-3 border-l-2 border-edge pl-3 text-[12px] leading-relaxed text-muted/70">
          本站不提供交易与代练服务；改枪码版权归原作者所有，本站只做玩家间的整理与交流。
          导入失败时先确认复制完整，再核对 0/O、1/I 等易混字符；部分配件在版本平衡后可能调整，
          失效方案会逐步下架或更新。发现好用的方案可点页面右上角「录入改枪码」自行补充。
        </p>
      </section>
    </div>
  );
}
