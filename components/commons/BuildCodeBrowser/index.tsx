/**
 * @component BuildCodeBrowser
 * @description 改枪码浏览器：场景 Tab（烽火地带 / 全面战场）+ 枪械 / 价格区间 / 排序筛选，
 *              卡片展示方案名、关联武器图、改装总价、方案标签与备注，底部一键复制改枪码
 *              （Clipboard API 不可用时回退 execCommand）；面板参数统一跳武器图鉴查看，不在此重复
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/commons/SmartImage';
import { IconCheck, IconCopy, IconRifle, IconReset, IconWrench } from '@/components/commons/icons';
import {
  BUILD_PRICE_RANGES,
  BUILD_SCENARIOS,
  BUILD_SORT_OPTIONS,
  BUILD_TAG_BASE_CLASS,
  getBuildTagClass,
} from '@/constants/build-code';
import { copyText } from '@/lib/clipboard';
import { formatPriceWan } from '@/lib/format';
import type { BuildCodeView, BuildScenario } from '@/types/build-code';

/** 复制按钮状态：idle 待复制 / copied 成功 / failed 失败（提示手动选择） */
type CopyState = 'idle' | 'copied' | 'failed';

/**
 * 下拉筛选控件（透明原生 select + 自绘箭头，原生弹层展开时箭头不会闪）
 * @param props.label - 无障碍标签
 * @param props.value - 当前值
 * @param props.onChange - 值变更回调
 * @param props.options - 选项列表
 */
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly { value: string; label: string }[];
}) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="num w-full rounded border border-edge bg-bg py-2 pl-3 pr-8 text-[12px] text-main outline-none transition-colors hover:border-accent/50 focus:border-accent sm:text-[13px]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden="true"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </label>
  );
}

/**
 * 单个改枪方案卡片（复制状态就地维护，避免整个列表重渲染）
 * @description 悬停高亮走 tac-hover-border：`.tac-panel:hover` 是未分层样式（优先级高于所有
 *              @layer utilities），会盖掉 Tailwind 的 hover:border-accent/40，只有专门的
 *              `.tac-panel.tac-hover-border:hover` 才能把边框提到强调色
 * @param props.item - 构建期补全后的方案展示模型
 */
function BuildCard({ item }: { item: BuildCodeView }) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  /** 复制结果提示的自动复位定时器，卸载时必须清理 */
  const timerRef = useRef<number | null>(null);
  /** 是否展示增减值行：整卡都没填增减值时省掉，避免 8 个「—」占两行高度 */
  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  /** 点击复制：成功 1.8s 后复位，失败保留更久便于看清提示 */
  const handleCopy = useCallback(async () => {
    const ok = await copyText(item.code);
    setCopyState(ok ? 'copied' : 'failed');
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopyState('idle'), ok ? 1800 : 3200);
  }, [item.code]);

  return (
    <article className="tac-panel tac-panel-plain tac-hover-border group flex flex-col overflow-hidden rounded-md transition-colors">
      {/* 头部：推荐星标 + 方案名 + 录入日期（只留月日，完整日期放 title） */}
      <div className="px-4 pb-2 pt-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="min-w-0 text-[15px] font-semibold leading-snug tracking-wide">
            {item.featured && (
              <span className="mr-1 text-t5" aria-label="站内推荐">
                ★
              </span>
            )}
            {item.title}
          </h3>
          {/* 改装总价移到标题右侧，用「23万」压缩长度；完整数字放 title，无价格时标注待补充 */}
          <span
            className="num shrink-0 pt-0.5 text-[15px] font-bold leading-none text-main"
            title={
              item.price === null
                ? '改装总价待补充'
                : `改装总价 ${item.price.toLocaleString('en-US')} 哈夫币`
            }
          >
            {item.price === null ? (
              <span className="text-[10px] font-normal text-muted/60">待补充</span>
            ) : (
              formatPriceWan(item.price)
            )}
          </span>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted">
          {item.weapon ? (
            <Link
              href={`/weapons/${item.weapon.id}`}
              className="truncate rounded transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
            >
              {item.weapon.name}
            </Link>
          ) : (
            <span className="truncate">{item.weaponName}</span>
          )}
          {item.weapon?.caliber && (
            <span className="num rounded bg-accent/10 px-1 py-px font-medium text-accent">
              {item.weapon.caliber}
            </span>
          )}
          {/* 录入日期退到武器行末（ml-auto 贴右），完整日期放 title */}
          {item.createdAt && (
            <span
              className="num ml-auto shrink-0 text-[10px] text-muted/45"
              title={`录入于 ${item.createdAt}`}
            >
              {item.createdAt.slice(5).replace('-', '/')}
            </span>
          )}
        </p>
      </div>

      {/* 图片区：内嵌圆角图卡（不用贯穿分隔线把卡片切成条带）。
          用固定高度而非宽高比：窄屏单列时卡片变宽，按比例会把图拉得过高，
          固定 108px 让三列与单列的行高一致，整卡高度也能稳定压住。
          底色用页面底（bg-bg 实底）+ /70 描边：卡片头部是 panel 渐变面，若图槽只叠半透明底
          两者会糊成一片，实底深一档才能看出「凹槽」，与武器图鉴卡片保持同一套层次。
          hover 时枪械轻微放大增加响应感 */}
      <div className="mx-4 overflow-hidden rounded border border-edge/70">
        <div className="thumb-bg flex h-[108px] items-center justify-center bg-thumb-slot px-4">
          <SmartImage
            src={item.weapon?.image ?? ''}
            alt={item.weaponName}
            className="weapon-img max-h-[88%] max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.04]"
            fallback={
              <span className="flex items-center justify-center text-muted/30">
                <IconRifle className="h-12 w-12" />
              </span>
            }
          />
        </div>
      </div>

      {/* 标签 + 备注：图卡下方合成一块，标签在前做玩法定位，备注限两行避免撑高同排卡片；
          flex-1 让不同备注长度的卡片把底部操作条压到同一水平线 */}
      <div className="flex flex-1 flex-col gap-1.5 px-4 pb-2.5 pt-3.5">
        {item.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <li key={tag} className={`${BUILD_TAG_BASE_CLASS} ${getBuildTagClass(tag)}`}>
                {tag}
              </li>
            ))}
          </ul>
        )}
        {item.note && (
          <p className="line-clamp-2 text-[12px] leading-relaxed text-muted" title={item.note}>
            {item.note}
          </p>
        )}
      </div>

      {/* 底部操作：整行是复制热区（代码可整段选中，Clipboard API 不可用时手动兜底）；
          整条默认铺淡强调色底 + 强调色上边线，让它与上方内容区分成一条可行区域；
          右侧「复制」胶囊直接实心强调色，hover 整行再提亮一档，点击反馈明确；
          成功转绿、失败转红；mt-auto 把操作条压到卡片底部对齐 */}
      <button
        type="button"
        onClick={handleCopy}
        aria-live="polite"
        title="点击复制改枪码，也可手动选中后复制"
        className={`group mt-auto flex w-full cursor-pointer items-center gap-2.5 border-t px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60 ${
          copyState === 'copied'
            ? 'border-t2/30 bg-t2/10'
            : copyState === 'failed'
              ? 'border-danger/30 bg-danger/10'
              : 'border-accent/25 bg-accent/10 hover:bg-accent/15 active:bg-accent/20'
        }`}
      >
        <span
          className={`num min-w-0 flex-1 select-all break-all text-[11px] leading-relaxed transition-colors ${
            copyState === 'copied'
              ? 'text-t2'
              : copyState === 'failed'
                ? 'text-danger'
                : 'text-main/80 group-hover:text-main'
          }`}
        >
          {item.code}
        </span>
        <span
          className={`flex shrink-0 items-center gap-1 rounded border px-2 py-1 text-[12px] font-medium leading-none text-[color:var(--on-accent)] transition-[filter,background-color,border-color] ${
            copyState === 'copied'
              ? 'border-t2 bg-t2'
              : copyState === 'failed'
                ? 'border-danger bg-danger'
                : 'border-accent bg-accent group-hover:brightness-110'
          }`}
        >
          {copyState === 'copied' ? (
            <IconCheck className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <IconCopy className="h-3.5 w-3.5 shrink-0" />
          )}
          {copyState === 'copied' ? '已复制' : copyState === 'failed' ? '手动选中' : '复制'}
        </span>
      </button>
    </article>
  );
}

/** BuildCodeBrowser 组件入参 */
interface BuildCodeBrowserProps {
  /** 全部方案（构建期已关联武器、补齐面板） */
  builds: BuildCodeView[];
}

export default function BuildCodeBrowser({ builds }: BuildCodeBrowserProps) {
  /** 当前场景（默认烽火地带，全面战场后续补充） */
  const [scenario, setScenario] = useState<BuildScenario>('firestorm');
  /** 枪械筛选：'all' 表示不筛选，其余为武器展示名 */
  const [weaponFilter, setWeaponFilter] = useState('all');
  /** 价格区间筛选：值为 BUILD_PRICE_RANGES 的 value */
  const [priceFilter, setPriceFilter] = useState('all');
  /** 排序方式（默认价格从高到低） */
  const [sort, setSort] = useState<string>('price-desc');

  /** 各场景方案数量（Tab 角标，统计全量而非当前筛选结果） */
  const scenarioCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of BUILD_SCENARIOS) counts[item.value] = 0;
    for (const build of builds) counts[build.scenario] = (counts[build.scenario] ?? 0) + 1;
    return counts;
  }, [builds]);

  /** 枪械下拉项：按武器名聚合全量方案，带数量便于判断哪把枪方案多 */
  const weaponOptions = useMemo(() => {
    const grouped = new Map<string, number>();
    for (const build of builds) {
      const name = build.weapon?.name ?? build.weaponName;
      grouped.set(name, (grouped.get(name) ?? 0) + 1);
    }
    const sorted = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b, 'zh'));
    return [
      { value: 'all', label: '筛选枪械' },
      ...sorted.map(([name, count]) => ({ value: name, label: `${name}（${count}）` })),
    ];
  }, [builds]);

  /** 复位三个筛选条件（场景 Tab 属于浏览位置，不随重置变化） */
  const resetFilters = useCallback(() => {
    setWeaponFilter('all');
    setPriceFilter('all');
    setSort('price-desc');
  }, []);

  /**
   * 待展示方案：场景 → 枪械 → 价格区间逐层过滤，再排序
   * @description 价格未标注的方案不参与区间筛选，排序时统一沉底（避免被当成 0 元置顶）
   */
  const list = useMemo(() => {
    const range = BUILD_PRICE_RANGES.find((item) => item.value === priceFilter) ?? BUILD_PRICE_RANGES[0];
    const filtered = builds.filter((build) => {
      if (build.scenario !== scenario) return false;
      if (weaponFilter !== 'all' && (build.weapon?.name ?? build.weaponName) !== weaponFilter) {
        return false;
      }
      if (priceFilter !== 'all') {
        if (build.price === null) return false;
        if (build.price < range.min || build.price >= range.max) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt);
      if (a.price === null && b.price === null) return 0;
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return sort === 'price-asc' ? a.price - b.price : b.price - a.price;
    });
  }, [builds, scenario, weaponFilter, priceFilter, sort]);

  /** 当前结果的均价：只统计标了价格的方案，用于给「贵 / 便宜」一个直观参照 */
  const averagePrice = useMemo(() => {
    const prices = list.map((item) => item.price).filter((price): price is number => price !== null);
    if (prices.length === 0) return null;
    return Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length);
  }, [list]);

  return (
    <div>
      {/* 筛选栏：窄屏 2 列、桌面单行；重置按钮固定靠右 */}
      <div className="tac-panel tac-panel-plain mb-3 flex flex-wrap items-center gap-2 rounded-lg p-2.5 sm:mb-4 sm:p-3">
        <span className="hidden text-[12px] tracking-[0.16em] text-muted sm:inline">筛选</span>
        <div className="grid flex-1 grid-cols-2 gap-2 sm:flex sm:flex-none sm:gap-2">
          <div className="col-span-2 sm:w-44">
            <FilterSelect
              label="按枪械筛选"
              value={weaponFilter}
              onChange={setWeaponFilter}
              options={weaponOptions}
            />
          </div>
          <div className="sm:w-32">
            <FilterSelect
              label="按价格筛选"
              value={priceFilter}
              onChange={setPriceFilter}
              options={BUILD_PRICE_RANGES.map(({ value, label }) => ({ value, label }))}
            />
          </div>
          <div className="sm:w-32">
            <FilterSelect
              label="排序方式"
              value={sort}
              onChange={setSort}
              options={BUILD_SORT_OPTIONS}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="ml-auto flex items-center gap-1.5 rounded border border-danger/50 bg-danger/10 px-3 py-2 text-[12px] text-danger transition-colors hover:bg-danger/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-danger/60 sm:text-[13px]"
        >
          <IconReset className="h-3.5 w-3.5" />
          重置
        </button>
      </div>

      {/* 场景 Tab：整行两等分，选中态强调色描边 + 底部高亮线 */}
      <div
        role="tablist"
        aria-label="改枪码适用场景"
        className="mb-3 grid grid-cols-2 overflow-hidden rounded-lg border border-edge bg-panel/40 sm:mb-4"
      >
        {BUILD_SCENARIOS.map((item) => {
          const active = scenario === item.value;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setScenario(item.value)}
              className={`relative py-2.5 text-[13px] font-semibold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/60 ${
                active ? 'bg-accent/10 text-accent' : 'text-muted hover:text-main'
              }`}
            >
              {item.label}
              <span
                className={`num ml-2 rounded px-1.5 py-0.5 text-[10px] font-normal transition-colors ${
                  active ? 'bg-accent/15 text-accent' : 'bg-panel-hi text-muted/70'
                }`}
              >
                {scenarioCounts[item.value] ?? 0}
              </span>
              {active && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {/* 结果计数：说明当前筛选后的总量；录入入口已上移到页头操作区（抽屉打开） */}
      <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
        <span>
          共 <b className="num text-accent">{list.length}</b> 套方案
        </span>
        {averagePrice !== null && (
          <span className="text-muted/60">
            · 均价 <span className="num">{(averagePrice / 10000).toFixed(1)} 万</span>
          </span>
        )}
        {list.length > 0 && (
          <span className="hidden text-muted/60 sm:inline">· 点击卡片底部复制改枪码</span>
        )}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-4 xl:grid-cols-3">
        {list.map((item) => (
          <BuildCard key={item.id} item={item} />
        ))}
      </div>

      {/* 空状态：区分「该场景尚未收录」与「筛选无结果」，避免用户误以为数据丢失 */}
      {list.length === 0 && (
        <div className="tac-panel tac-panel-plain flex flex-col items-center gap-2 rounded-lg px-4 py-12 text-center">
          <IconWrench className="h-8 w-8 text-muted/40" />
          <p className="text-sm text-muted">
            {priceFilter !== 'all' || weaponFilter !== 'all'
              ? '当前筛选条件下没有方案，试试放宽条件或重置筛选'
              : '该场景的改枪码正在整理中，敬请期待'}
          </p>
          {(priceFilter !== 'all' || weaponFilter !== 'all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded border border-edge px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-accent hover:text-accent"
            >
              重置筛选
            </button>
          )}
        </div>
      )}
    </div>
  );
}
