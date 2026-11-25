/**
 * @component AmmoBrowser
 * @description 弹药库浏览器：口径筛选 + 穿透/品阶筛选，按口径分组表格展示，行点击打开详情抽屉
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-25
 */
'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { IconAmmo, IconRifle } from '@/components/commons/icons';
import { AMMO_EFFECT_TONE, CALIBER_ICON } from '@/constants/game';
import { describeAmmoEffects } from '@/lib/ammo-effects';
import type { AmmoEffects } from '@/types/ammo';

/** 弹药的适用枪械（含本地图片，供详情抽屉展示） */
interface AmmoWeapon {
  /** 武器 objectID，用于跳转 /weapons/[id] */
  id: string;
  /** 武器名 */
  name: string;
  /** 本地图片路径，空串表示无图 */
  image: string;
}

/** 弹药展示模型（来自 lib/db 的 getAmmoWithWeapons 聚合结果） */
interface AmmoItem {
  /** 弹药 itemID */
  id: string;
  /** 弹药型号名（不含口径前缀） */
  name: string;
  /** 口径，如 5.56x45mm */
  caliber: string;
  /** 品阶 1-5，专属弹可能为 null */
  tier: number | null;
  /** 品阶中文名：白/绿/蓝/紫/橙/金 */
  rarity: string;
  /** 穿透等级 0-7 */
  pen_level: number;
  /** 肉体伤害倍率 */
  dmg_ratio: number;
  /** 护甲伤害倍率 */
  armor_ratio: number;
  /** 命中特效（构建期由 effects JSON 解析而来），无特效为空对象 */
  effects?: AmmoEffects;
  /** 是否赛季限定（1=是） */
  season_limited: number;
  /** 备注：限定弹标注赛季，特殊弹标注机制，可为空串 */
  note?: string;
  /** 适用枪械名（顿号分隔） */
  weaponNames: string | null;
  /** 适用枪械明细（含图片），无关联为空数组 */
  weapons?: AmmoWeapon[];
}

const TIER_COLOR = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)'];
const RARITY_LABEL: Record<string, string> = { 白: '白弹', 绿: '绿弹', 蓝: '蓝弹', 紫: '紫弹', 橙: '金弹', 金: '金弹', 红: '专属弹' };

/**
 * 弹药品阶配色：红品阶（专属弹，穿 6/7）与常规五阶分开取色
 * @param a - 弹药数据
 * @returns 主题色变量
 */
function ammoTierColor(a: AmmoItem): string {
  if (a.rarity === '红' || a.pen_level >= 6) return 'var(--danger)';
  return a.tier ? TIER_COLOR[a.tier - 1] : 'var(--t1)';
}

/**
 * 从备注中提取赛季号（限定弹备注形如「S11赛季限定子弹」）
 * @param note - 弹药备注
 * @returns 赛季标记（如 S11），无匹配返回空串
 */
function seasonTag(note?: string): string {
  return note?.match(/S\d+/)?.[0] ?? '';
}

/**
 * 口径图标：优先使用官方真实贴图，无贴图时回退到子弹 SVG
 * @param caliber - 口径名（数据源原始值）
 * @param className - 尺寸等样式类
 */
function CaliberIcon({ caliber, className }: { caliber: string; className?: string }) {
  const src = CALIBER_ICON[caliber];
  if (src) {
    return (
      <img
        src={src}
        alt={caliber}
        loading="lazy"
        className={`${className ?? ''} object-contain shrink-0`}
        onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
      />
    );
  }
  return <IconAmmo className={className} />;
}

/** 品阶徽章 */
function TierBadge({ a }: { a: AmmoItem }) {
  const color = ammoTierColor(a);
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
        {pct}%
      </span>
      <div className="hidden lg:block w-16 h-1.5 bg-bg rounded overflow-hidden">
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

export default function AmmoBrowser({ ammo }: { ammo: AmmoItem[] }) {
  const sp = useSearchParams();
  const [caliber, setCaliber] = useState('全部');
  const [pen, setPen] = useState('全部');
  const [tier, setTier] = useState('全部');
  const [selected, setSelected] = useState<AmmoItem | null>(
    sp.get('q') ? (ammo.find((a) => a.name.toLowerCase().includes(sp.get('q')!.toLowerCase())) ?? null) : null
  );

  const calibers = useMemo(() => ['全部', ...new Set(ammo.map((a) => a.caliber))], [ammo]);

  const filtered = useMemo(
    () =>
      ammo.filter((a) => {
        if (caliber !== '全部' && a.caliber !== caliber) return false;
        if (pen !== '全部' && String(a.pen_level) !== pen) return false;
        // 品阶：专属弹（红品阶）无常规阶数，单独作为一个筛选项
        if (tier === '专属') {
          if (a.rarity !== '红' && a.tier !== null) return false;
        } else if (tier !== '全部' && String(a.tier) !== tier) return false;
        return true;
      }),
    [ammo, caliber, pen, tier]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, AmmoItem[]>();
    for (const a of filtered) {
      if (!map.has(a.caliber)) map.set(a.caliber, []);
      map.get(a.caliber)!.push(a);
    }
    // 组内按穿透等级降序
    for (const list of map.values()) list.sort((x, y) => y.pen_level - x.pen_level || (y.tier ?? 0) - (x.tier ?? 0));
    return [...map.entries()];
  }, [filtered]);

  const filterGroups = [
    { label: '口径', value: caliber, set: setCaliber, opts: calibers },
    { label: '穿透等级', value: pen, set: setPen, opts: ['全部', '0', '1', '2', '3', '4', '5', '6', '7'] },
    { label: '品阶', value: tier, set: setTier, opts: ['全部', '1', '2', '3', '4', '5', '专属'] },
  ];

  // 抽屉内的特效明细（无选中或无特效时为空数组）
  const selectedEffects = describeAmmoEffects(selected?.effects);
  // 抽屉内的适用枪械（含本地图片，无关联时为空数组）
  const selectedWeapons = selected?.weapons ?? [];

  return (
    <div className="flex flex-col md:flex-row gap-5">
      {/* 筛选面板 */}
      <aside className="md:w-48 md:shrink-0 md:sticky md:top-20 self-start">
        <div className="tac-panel tac-panel-plain rounded-lg p-3.5 space-y-4">
          <h2 className="text-[11px] tracking-[0.2em] text-muted uppercase border-b border-edge pb-2">筛选条件</h2>
          {filterGroups.map((f) => (
            <label key={f.label} className="block">
              <span className="text-xs text-muted">{f.label}</span>
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
          <button
            onClick={() => {
              setCaliber('全部');
              setPen('全部');
              setTier('全部');
            }}
            className="w-full text-xs border border-edge rounded py-1.5 hover:border-accent hover:text-accent transition-colors"
          >
            重置筛选
          </button>
          <p className="num text-[11px] text-muted leading-relaxed pt-2 border-t border-edge">
            共 <b className="text-accent">{filtered.length}</b> 种
            <br />
            穿透等级即玩家俗称的「N级弹」
          </p>
        </div>
      </aside>

      {/* 分组表格 */}
      <div className="flex-1 space-y-6 min-w-0">
        {grouped.map(([cal, list]) => (
          <section key={cal} className="tac-panel tac-panel-plain rounded-lg overflow-hidden">
            <h2 className="num text-base text-accent px-4 py-3 border-b border-edge flex items-center gap-2.5">
              <CaliberIcon caliber={cal} className="w-7 h-7" />
              {cal}
              <span className="badge text-muted">{list.length} 种</span>
              <span className="flex-1" />
              <Link href="/ammo/matrix" className="text-[11px] text-muted hover:text-accent transition-colors">
                穿甲对照 →
              </Link>
            </h2>
            <div className="overflow-x-auto">
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
                    // 枪械名按拼音序稳定排列，避免 GROUP_CONCAT 顺序随查询计划变化
                    const weapons = (a.weaponNames ?? '')
                      .split('、')
                      .filter(Boolean)
                      .sort((x, y) => x.localeCompare(y, 'zh'));
                    return (
                      <tr
                        key={a.id}
                        onClick={() => setSelected(a)}
                        className="border-b border-edge/60 last:border-0 cursor-pointer hover:bg-panel-hi/60 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="shrink-0" style={{ color: ammoTierColor(a) }}>
                              <IconAmmo className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium num">{a.name}</span>
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
                          <DmgBar ratio={a.dmg_ratio} color={a.dmg_ratio >= 1.1 ? 'var(--t5)' : a.dmg_ratio < 1 ? 'var(--muted)' : 'var(--text)'} />
                        </td>
                        <td className="px-3 py-3">
                          <DmgBar ratio={a.armor_ratio} color={a.armor_ratio >= 1.1 ? 'var(--t5)' : a.armor_ratio < 1 ? 'var(--muted)' : 'var(--info)'} />
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
          </section>
        ))}
        {!filtered.length && <p className="text-muted text-sm py-10 text-center">没有符合条件的弹药</p>}
      </div>

      {/* 详情侧滑抽屉 */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-[color:var(--overlay)] anim-fade" onClick={() => setSelected(null)}>
          <div
            className="absolute right-0 top-0 h-full w-full sm:w-96 bg-panel border-l border-edge p-6 overflow-y-auto anim-slide [box-shadow:var(--drawer-shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold num">{selected.name}</h3>
                <p className="num text-xs text-muted mt-0.5">
                  {selected.caliber} · {RARITY_LABEL[selected.rarity] ?? selected.rarity}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-accent text-2xl leading-none">
                ×
              </button>
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
                <p className="num text-lg font-bold mt-1" style={{ color: ammoTierColor(selected) }}>
                  {selected.tier ? `${selected.tier} 阶` : '专属弹'}
                </p>
              </div>
              <div className="tac-panel tac-panel-plain rounded-lg p-3 text-center">
                <p className="text-[11px] text-muted">肉体伤害倍率</p>
                <p className="num text-lg font-bold mt-1">{Math.round(selected.dmg_ratio * 100)}%</p>
              </div>
              <div className="tac-panel tac-panel-plain rounded-lg p-3 text-center">
                <p className="text-[11px] text-muted">护甲伤害倍率</p>
                <p className="num text-lg font-bold mt-1">{Math.round(selected.armor_ratio * 100)}%</p>
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
              <span className="num text-[11px] font-normal text-muted">
                {selectedWeapons.length || (selected.weaponNames?.split('、').filter(Boolean).length ?? 0)} 把
              </span>
              <span className="flex-1 h-px bg-edge" />
            </h4>
            {/* 枪械带官方图，点击可跳转对应图鉴详情 */}
            {selectedWeapons.length ? (
              <ul className="grid grid-cols-2 gap-2">
                {selectedWeapons.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`/weapons/${w.id}`}
                      onClick={() => setSelected(null)}
                      className="flex items-center gap-2 rounded border border-edge bg-bg/40 px-2 py-1.5 hover:border-accent hover:text-accent transition-colors"
                      title={w.name}
                    >
                      <span className="w-12 h-8 shrink-0 flex items-center justify-center">
                        {w.image ? (
                          <img src={w.image} alt={w.name} loading="lazy" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <IconRifle className="w-5 h-5 text-muted/40" />
                        )}
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
              onClick={() => setSelected(null)}
            >
              查看穿甲对照矩阵 →
            </Link>
            <p className="text-[11px] text-muted mt-5 leading-relaxed">
              数值与游戏内弹药面板一致（穿透等级 / 伤害比例 / 品阶）。
              枪械基础伤害 × 伤害倍率 = 对枪实际伤害。仅供参考。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
