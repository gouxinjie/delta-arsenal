/**
 * @component AmmoBrowser
 * @description 弹药库浏览器：口径筛选 + 穿透/品阶筛选，按口径分组表格展示，行点击打开详情抽屉
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-26
 */
'use client';

import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Drawer from '@/components/commons/Drawer';
import SmartImage from '@/components/commons/SmartImage';
import { IconAmmo, IconRifle } from '@/components/commons/icons';
import {
  AMMO_EFFECT_TONE,
  CALIBER_ICON,
  RARITY_LABEL,
  ammoColor,
  isExclusiveAmmo,
} from '@/constants/game';
import { describeAmmoEffects } from '@/lib/ammo-effects';
import { formatPercent } from '@/lib/format';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { AmmoEffects, AmmoView } from '@/types/ammo';

/**
 * 从备注中提取赛季号（限定弹备注形如「S11赛季限定子弹」）
 * @param note - 弹药备注
 * @returns 赛季标记（如 S11），无匹配返回空串
 */
function seasonTag(note?: string): string {
  return note?.match(/S\d+/)?.[0] ?? '';
}

/**
 * 拆分适用枪械名并按拼音稳定排序（数据库 GROUP_CONCAT 顺序随查询计划变化）
 * @param names - 「、」分隔的枪械名字符串，无关联为空串
 * @returns 排序后的枪名数组，无数据时为空数组
 */
function splitWeapons(names: string): string[] {
  return names.split('、').filter(Boolean).sort((x, y) => x.localeCompare(y, 'zh'));
}

/**
 * 肉体伤害倍率配色：高伤金色、减伤灰、常规用正文色
 * @param ratio - 伤害倍率
 * @returns 主题色变量
 */
function dmgColor(ratio: number): string {
  return ratio >= 1.1 ? 'var(--t5)' : ratio < 1 ? 'var(--muted)' : 'var(--text)';
}

/**
 * 护甲伤害倍率配色：高伤金色、减伤灰、常规用信息蓝
 * @param ratio - 伤害倍率
 * @returns 主题色变量
 */
function armorColor(ratio: number): string {
  return ratio >= 1.1 ? 'var(--t5)' : ratio < 1 ? 'var(--muted)' : 'var(--info)';
}

/**
 * 口径图标：优先使用官方真实贴图，无贴图或加载失败时回退到子弹 SVG
 * @param props.caliber - 口径名（数据源原始值）
 * @param props.className - 尺寸等样式类
 */
function CaliberIcon({ caliber, className }: { caliber: string; className?: string }) {
  return (
    <SmartImage
      src={CALIBER_ICON[caliber] ?? ''}
      alt={caliber}
      className={`${className ?? ''} object-contain shrink-0`}
      fallback={<IconAmmo className={className} />}
    />
  );
}

/** 品阶徽章 */
function TierBadge({ a }: { a: AmmoView }) {
  const color = ammoColor(a);
  return (
    <span className="badge shrink-0" style={{ color, borderColor: color }} title={`品阶：${a.tier ?? '专属'}（${a.rarity}）`}>
      {RARITY_LABEL[a.rarity] ?? `${a.tier ?? '?'}阶`}
    </span>
  );
}

/** 穿透等级数字卡片（醒目） */
function PenBadge({ pen }: { pen: number }) {
  const color =
    pen >= 6 ? 'var(--danger)' : pen >= 5 ? 'var(--t5)' : pen >= 4 ? 'var(--t4)' : pen >= 3 ? 'var(--t3)' : pen >= 2 ? 'var(--t2)' : 'var(--t1)';
  return (
    <span
      className="num font-bold text-base w-[31px] h-[31px] inline-flex items-center justify-center rounded border"
      style={{
        color,
        borderColor: color,
        background: 'var(--chip-bg)',
        boxShadow: `0 0 12px color-mix(in srgb, ${color} 18%, transparent)`,
      }}
      title={`穿透等级 ${pen} 级`}
    >
      {pen}
    </span>
  );
}

/** 伤害倍率进度条（数值 + 封顶进度条） */
function DmgBar({ ratio, color }: { ratio: number; color: string }) {
  const pct = Math.round(ratio * 100);
  return (
    <div className="flex items-center gap-2.5">
      <span className="num text-sm font-semibold w-10 text-right shrink-0" style={{ color }}>
        {formatPercent(ratio)}
      </span>
      <div className="block w-10 h-1.5 bg-bg rounded overflow-hidden sm:w-16">
        <div className="h-full rounded" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
    </div>
  );
}

/**
 * 弹种特点徽章：仅对有命中特效的弹药渲染，悬停展示完整参数
 * @param effects - 弹药命中特效对象
 */
function EffectBadges({ effects }: { effects?: AmmoEffects }) {
  const list = describeAmmoEffects(effects);
  if (!list.length) return <span className="text-[11px] text-muted/50">—</span>;
  return (
    <div className="flex flex-col gap-1">
      {list.map((e) => (
        <div key={e.key} className="flex flex-col gap-0.5" title={e.detail}>
          <span
            className="badge shrink-0 w-fit"
            style={{ color: AMMO_EFFECT_TONE[e.key], borderColor: AMMO_EFFECT_TONE[e.key] }}
          >
            {e.label}
          </span>
          <span className="num text-[11px] leading-snug text-muted whitespace-nowrap">{e.brief}</span>
        </div>
      ))}
    </div>
  );
}

export default function AmmoBrowser({ ammo }: { ammo: AmmoView[] }) {
  const sp = useSearchParams();
  const [caliber, setCaliber] = useState('全部');
  const [pen, setPen] = useState('全部');
  const [tier, setTier] = useState('全部');
  /** 用户从列表点开的目标（优先级高于 URL 参数） */
  const [picked, setPicked] = useState<AmmoView | null>(null);
  /** 已关闭过的 URL 参数指纹：避免用户关掉抽屉后被同一组参数重新顶开 */
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  /**
   * 当前视口是否达到桌面断点（与 Tailwind 的 md 断点 768px 对齐）
   * 移动端列表与桌面表格此前是两套 DOM 全量输出、只靠 CSS 隐藏其一，
   * 118 条弹药意味着每次进入弹药库要多创建约三千个节点；判定出视口后只保留命中的那套。
   * null 表示服务端 / 水合首帧尚不可知，此时两套都渲染，保证与服务端 HTML 一致。
   */
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const showMobileList = isDesktop !== true;
  const showDesktopTable = isDesktop !== false;

  /** 搜索弹窗 / 武器详情传入的弹药 id（精确命中） */
  const ammoParam = sp.get('ammo');
  /** 旧链接兜底：按名称模糊命中 */
  const queryParam = sp.get('q');
  const paramKey = `${ammoParam ?? ''}|${queryParam ?? ''}`;

  // 选中项由「列表点击」与「URL 参数」派生得到，不在 effect 里 setState：
  // 路由 query 变化不会重挂载组件，派生值可直接跟随 URL，同时避免级联渲染
  const selected = useMemo<AmmoView | null>(() => {
    if (picked) return picked;
    if (!ammoParam && !queryParam) return null;
    if (dismissedKey === paramKey) return null;
    if (ammoParam) return ammo.find((a) => a.id === ammoParam) ?? null;
    if (!queryParam) return null;
    const keyword = queryParam.toLowerCase();
    return ammo.find((a) => a.name.toLowerCase().includes(keyword)) ?? null;
  }, [picked, ammo, ammoParam, queryParam, paramKey, dismissedKey]);

  const calibers = useMemo(() => ['全部', ...new Set(ammo.map((a) => a.caliber))], [ammo]);

  const filtered = useMemo(
    () =>
      ammo.filter((a) => {
        if (caliber !== '全部' && a.caliber !== caliber) return false;
        if (pen !== '全部' && String(a.pen_level) !== pen) return false;
        // 品阶：专属弹单独作为一个筛选项
        // 判定 = 矩阵页同款 isExclusiveAmmo（穿 6/7 或红品阶）∪ 无常规品阶（tier 为 null），两者取并集不漏弹
        if (tier === '专属') {
          if (!isExclusiveAmmo(a) && a.tier !== null) return false;
        } else if (tier !== '全部' && String(a.tier) !== tier) return false;
        return true;
      }),
    [ammo, caliber, pen, tier]
  );

  // 组内顺序由 SQL 保证（ORDER BY caliber, pen_level DESC, tier DESC），此处只做分组，不再重复排序
  const grouped = useMemo(() => {
    const map = new Map<string, AmmoView[]>();
    for (const a of filtered) {
      if (!map.has(a.caliber)) map.set(a.caliber, []);
      map.get(a.caliber)!.push(a);
    }
    return [...map.entries()];
  }, [filtered]);

  /** 重置全部筛选条件（移动端把入口收进筛选面板标题行） */
  const resetFilters = () => {
    setCaliber('全部');
    setPen('全部');
    setTier('全部');
  };

  const filterGroups = [
    { label: '口径', value: caliber, set: setCaliber, opts: calibers },
    { label: '穿透等级', value: pen, set: setPen, opts: ['全部', '0', '1', '2', '3', '4', '5', '6', '7'] },
    { label: '品阶', value: tier, set: setTier, opts: ['全部', '1', '2', '3', '4', '5', '专属'] },
  ];

  // 抽屉内的特效明细（无选中或无特效时为空数组）
  const selectedEffects = describeAmmoEffects(selected?.effects);
  // 抽屉内的适用枪械（含本地图片，无关联时为空数组）
  const selectedWeapons = selected?.weapons ?? [];

  /** 关闭详情抽屉：同时记录当前参数指纹，避免被 URL 重新顶开 */
  const closeDrawer = useCallback(() => {
    setPicked(null);
    setDismissedKey(paramKey);
  }, [paramKey]);

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-5">
      {/* 筛选面板：窄屏占满整行，桌面恢复 192px 侧栏（不加 w-full 会因 self-start 收缩成半屏） */}
      <aside className="w-full self-start md:sticky md:top-20 md:w-48 md:shrink-0">
        <div className="tac-panel tac-panel-plain rounded-lg p-3 md:p-3.5">
          <div className="flex items-center justify-between gap-2 border-b border-edge pb-2">
            <h2 className="text-[11px] tracking-[0.2em] text-muted uppercase">筛选条件</h2>
            <button
              onClick={resetFilters}
              className="md:hidden text-[11px] border border-edge rounded px-2 py-0.5 text-muted hover:border-accent hover:text-accent transition-colors"
            >
              重置
            </button>
          </div>

          <div className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-2 md:mt-0 md:block md:space-y-4">
            {filterGroups.map((f, i) => (
              <label key={f.label} className={`block ${i === 0 ? 'col-span-2 md:col-span-1' : ''}`}>
                <span className="text-[11px] text-muted sm:text-xs">{f.label}</span>
                {/* 相对容器承载自绘箭头：原生弹层展开时不会重绘箭头，避免下拉闪烁 */}
                <span className="group relative mt-1 block">
                  <select
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                    className="num w-full bg-bg border border-edge rounded pl-2 pr-7 py-1.5 text-sm outline-none focus:border-accent"
                  >
                    {f.opts.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted transition-colors group-hover:text-main group-focus-within:text-accent"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </label>
            ))}
          </div>

          <button
            onClick={resetFilters}
            className="hidden md:block w-full mt-4 text-xs border border-edge rounded py-1.5 hover:border-accent hover:text-accent transition-colors"
          >
            重置筛选
          </button>
          <div className="mt-2.5 border-t border-edge pt-2 md:mt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="num text-[11px] text-muted">
                共 <b className="text-accent">{filtered.length}</b> 种
              </p>
              {/* 移动端矩阵入口只保留这一处，组标题不再重复 */}
              <Link href="/ammo/matrix" className="text-[11px] text-muted hover:text-accent transition-colors md:hidden">
                穿甲对照 →
              </Link>
            </div>
            <p className="num mt-2 hidden border-t border-edge pt-2 text-[11px] leading-relaxed text-muted md:block">
              穿透等级即玩家俗称的「N级弹」
            </p>
          </div>
        </div>
      </aside>

      {/* 分组列表：窄屏走紧凑双行条目，md 以上走宽表 */}
      <div className="flex-1 space-y-3 min-w-0 md:space-y-6">
        {grouped.map(([cal, list]) => (
          <section key={cal} className="tac-panel tac-panel-plain rounded-lg overflow-hidden">
            <h2 className="num flex items-center gap-2 border-b border-edge px-3 py-2.5 text-sm text-accent sm:px-4 sm:py-3 sm:text-base">
              <CaliberIcon caliber={cal} className="h-6 w-6 sm:h-7 sm:w-7" />
              <span className="truncate">{cal}</span>
              <span className="badge shrink-0 text-muted">{list.length} 种</span>
              <Link
                href="/ammo/matrix"
                className="ml-auto hidden shrink-0 whitespace-nowrap text-[11px] font-normal text-muted hover:text-accent transition-colors sm:inline"
              >
                穿甲对照 →
              </Link>
            </h2>

            {/* 移动端条目：口径已由组标题承载，条目只留「名称 / 品阶 / 穿透 / 双伤害 / 枪械数」 */}
            {showMobileList && (
            <ul className="md:hidden">
              {list.map((a) => {
                const effects = describeAmmoEffects(a.effects);
                const weaponCount = splitWeapons(a.weaponNames).length;
                return (
                  <li key={a.id} className="border-t border-edge/40 first:border-t-0">
                    <button
                      type="button"
                      onClick={() => setPicked(a)}
                      className="w-full px-3 py-2.5 text-left transition-colors active:bg-panel-hi/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-accent/50"
                    >
                      <div className="flex items-center gap-2">
                        <span className="shrink-0" style={{ color: ammoColor(a) }}>
                          <IconAmmo className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="num truncate text-[14px] font-medium">{a.name}</span>
                            <TierBadge a={a} />
                            {a.season_limited === 1 && (
                              <span className="badge shrink-0 !text-danger !border-danger/40" title={a.note || '赛季限定弹药'}>
                                {seasonTag(a.note) || '赛季'}限定
                              </span>
                            )}
                            <span className="ml-auto flex shrink-0 items-center gap-1">
                              <PenBadge pen={a.pen_level} />
                              <span className="text-base leading-none text-muted/40" aria-hidden="true">
                                ›
                              </span>
                            </span>
                          </div>

                          {/* 伤害倍率与关联枪械压成一行，用竖线分隔，避免数字与下一个标签粘连 */}
                          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted">
                            <span className="inline-flex items-baseline gap-1">
                              肉体
                              <b className="num text-[12px] font-semibold" style={{ color: dmgColor(a.dmg_ratio) }}>
                                {formatPercent(a.dmg_ratio)}
                              </b>
                            </span>
                            <span className="inline-flex items-baseline gap-1 border-l border-edge/70 pl-2.5">
                              护甲
                              <b className="num text-[12px] font-semibold" style={{ color: armorColor(a.armor_ratio) }}>
                                {formatPercent(a.armor_ratio)}
                              </b>
                            </span>
                            {weaponCount > 0 && <span className="num border-l border-edge/70 pl-2.5">适用 {weaponCount} 把</span>}
                            {effects.map((e) => (
                              <span
                                key={e.key}
                                className="badge shrink-0"
                                style={{ color: AMMO_EFFECT_TONE[e.key], borderColor: AMMO_EFFECT_TONE[e.key] }}
                                title={e.detail}
                              >
                                {e.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            )}

            {/* 桌面 / 平板：完整宽表（行点击仅为鼠标便利，键盘走首列按钮，保留表格语义） */}
            {showDesktopTable && (
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="text-xs text-muted border-b border-edge">
                    <th className="px-4 py-2.5 text-left font-normal">弹药（口径 + 型号）</th>
                    <th className="px-3 py-2.5 text-center font-normal">穿透</th>
                    <th className="px-3 py-2.5 text-left font-normal">肉体伤害</th>
                    <th className="px-3 py-2.5 text-left font-normal">护甲伤害</th>
                    <th className="px-3 py-2.5 text-left font-normal">特点</th>
                    <th className="px-4 py-2.5 text-right font-normal">适用枪械</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => {
                    const weapons = splitWeapons(a.weaponNames);
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setPicked(a)}
                        className="border-b border-edge/60 last:border-0 cursor-pointer hover:bg-panel-hi/60 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="shrink-0" style={{ color: ammoColor(a) }}>
                              <IconAmmo className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setPicked(a)}
                                  aria-label={`查看 ${a.name} 弹药详情`}
                                  className="num text-left font-medium rounded transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60"
                                >
                                  {a.name}
                                </button>
                                {a.season_limited === 1 && (
                                  <span className="badge !text-danger !border-danger/40" title={a.note || '赛季限定弹药'}>
                                    {seasonTag(a.note) || '赛季'}限定
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="num text-[11px] text-muted">{a.caliber}</span>
                                <TierBadge a={a} />
                              </div>
                              {/* 特殊弹机制说明（如「叠层触发爆炸」「命中附加燃烧」），限定弹的赛季标注已由徽章承载 */}
                              {a.season_limited !== 1 && a.note && <p className="num text-[11px] text-accent/80 mt-0.5">{a.note}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <PenBadge pen={a.pen_level} />
                        </td>
                        <td className="px-3 py-3">
                          <DmgBar ratio={a.dmg_ratio} color={dmgColor(a.dmg_ratio)} />
                        </td>
                        <td className="px-3 py-3">
                          <DmgBar ratio={a.armor_ratio} color={armorColor(a.armor_ratio)} />
                        </td>
                        <td className="px-3 py-3 align-top w-[150px]">
                          <EffectBadges effects={a.effects} />
                        </td>
                        {/* 适用枪械：直接列出枪名（最多两行，悬停看全量），不再只给数量 */}
                        <td
                          className="px-4 py-3 text-right align-middle w-[220px]"
                          title={weapons.length ? `${weapons.length} 把：${weapons.join('、')}` : '暂无关联枪械'}
                        >
                          {weapons.length ? (
                            <p className="text-[11px] leading-[1.6] text-muted line-clamp-2">{weapons.join('、')}</p>
                          ) : (
                            <span className="text-[11px] text-muted/60">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            )}
          </section>
        ))}
        {!filtered.length && <p className="text-muted text-sm py-10 text-center">没有符合条件的弹药</p>}
      </div>

      {/* 详情侧滑抽屉：移动端占满视口并避开安全区，桌面为 384px 侧栏（外壳与动效见 commons/Drawer） */}
      <Drawer
        open={!!selected}
        onClose={closeDrawer}
        ariaLabel={`${selected?.name ?? '弹药'} 弹药详情`}
        panelClassName="sm:w-96"
      >
        {selected && (
          <div className="flex-1 overflow-y-auto p-5 pr-12 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6 sm:pr-14">
            <div className="min-w-0">
              <h3 className="text-lg font-bold num">{selected.name}</h3>
              <p className="num text-xs text-muted mt-0.5">
                {selected.caliber} · {RARITY_LABEL[selected.rarity] ?? selected.rarity}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="tac-panel tac-panel-plain rounded-lg p-3 text-center">
                <p className="text-[11px] text-muted">穿透等级</p>
                <div className="mt-1.5 flex justify-center">
                  <PenBadge pen={selected.pen_level} />
                </div>
              </div>
              <div className="tac-panel tac-panel-plain rounded-lg p-3 text-center">
                <p className="text-[11px] text-muted">品阶</p>
                <p className="num text-lg font-bold mt-1" style={{ color: ammoColor(selected) }}>
                  {selected.tier ? `${selected.tier} 阶` : '专属弹'}
                </p>
              </div>
              <div className="tac-panel tac-panel-plain rounded-lg p-3 text-center">
                <p className="text-[11px] text-muted">肉体伤害倍率</p>
                <p className="num text-lg font-bold mt-1">{formatPercent(selected.dmg_ratio)}</p>
              </div>
              <div className="tac-panel tac-panel-plain rounded-lg p-3 text-center">
                <p className="text-[11px] text-muted">护甲伤害倍率</p>
                <p className="num text-lg font-bold mt-1">{formatPercent(selected.armor_ratio)}</p>
              </div>
            </div>

            {selectedEffects.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-bold mb-2 flex items-center gap-2">
                  弹种特点
                  <span className="flex-1 h-px bg-edge" />
                </h4>
                <div className="space-y-2">
                  {selectedEffects.map((e) => (
                    <div key={e.key} className="tac-panel tac-panel-plain rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <span className="badge" style={{ color: AMMO_EFFECT_TONE[e.key], borderColor: AMMO_EFFECT_TONE[e.key] }}>
                          {e.label}
                        </span>
                        <span className="num text-[11px] text-muted">{e.brief}</span>
                      </div>
                      <p className="text-[11px] text-muted leading-relaxed mt-2">{e.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 限定弹标注具体赛季，特殊弹标注机制（源数据 season_note） */}
            {selected.season_limited === 1 ? (
              <p className="mt-3 text-xs text-danger">⚠ {selected.note || '赛季限定弹药'}，赛季结束后无法获取</p>
            ) : (
              selected.note && <p className="mt-3 text-xs text-accent/90">◆ {selected.note}</p>
            )}

            <h4 className="text-sm font-bold mt-5 mb-2 flex items-center gap-2">
              适用枪械
              <span className="num text-[11px] font-normal text-muted">{splitWeapons(selected.weaponNames).length} 把</span>
              <span className="flex-1 h-px bg-edge" />
            </h4>
            {/* 枪械带官方图，点击可跳转对应图鉴详情 */}
            {selectedWeapons.length ? (
              <ul className="grid grid-cols-2 gap-2">
                {selectedWeapons.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`/weapons/${w.id}`}
                      onClick={closeDrawer}
                      className="flex items-center gap-2 rounded border border-edge bg-bg/40 px-2 py-1.5 hover:border-accent hover:text-accent transition-colors"
                      title={w.name}
                    >
                      <span className="w-12 h-8 shrink-0 flex items-center justify-center">
                        <SmartImage
                          src={w.image}
                          alt={w.name}
                          className="max-w-full max-h-full object-contain"
                          fallback={<IconRifle className="w-5 h-5 text-muted/40" />}
                        />
                      </span>
                      <span className="text-xs leading-tight truncate">{w.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted leading-relaxed">{selected.weaponNames || '（暂无关联枪械）'}</p>
            )}

            <Link
              href="/ammo/matrix"
              className="mt-6 block text-center text-sm border border-edge rounded py-2 hover:border-accent hover:text-accent transition-colors"
              onClick={closeDrawer}
            >
              查看穿甲对照矩阵 →
            </Link>
            <p className="text-[11px] text-muted mt-5 leading-relaxed">
              数值与游戏内弹药面板一致（穿透等级 / 伤害比例 / 品阶）。
              枪械基础伤害 × 伤害倍率 = 对枪实际伤害。仅供参考。
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}
