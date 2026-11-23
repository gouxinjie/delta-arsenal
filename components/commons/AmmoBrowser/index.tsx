/**
 * @component AmmoBrowser
 * @description 弹药库浏览器：口径筛选 + 穿透/品阶筛选，按口径分组表格展示，行点击打开详情抽屉
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-23
 */
'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
  /** 是否赛季限定（1=是） */
  season_limited: number;
  /** 适用枪械名（顿号分隔） */
  weaponNames: string | null;
}

const TIER_COLOR = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)'];
const RARITY_LABEL: Record<string, string> = { 白: '白弹', 绿: '绿弹', 蓝: '蓝弹', 紫: '紫弹', 橙: '金弹', 金: '金弹' };

function TierBadge({ a }: { a: AmmoItem }) {
  const color = a.tier ? TIER_COLOR[a.tier - 1] : 'var(--t1)';
  return (
    <span className="badge shrink-0" style={{ color, borderColor: color }} title={`品阶：${a.tier ?? '?'}（${a.rarity}）`}>
      {RARITY_LABEL[a.rarity] ?? `${a.tier ?? '?'}阶`}
    </span>
  );
}

function PenBadge({ pen }: { pen: number }) {
  const color = pen >= 6 ? 'var(--danger)' : pen >= 5 ? 'var(--t5)' : pen >= 4 ? 'var(--t4)' : pen >= 3 ? 'var(--t3)' : pen >= 2 ? 'var(--t2)' : 'var(--t1)';
  return (
    <span
      className="num font-bold text-lg w-8 h-8 inline-flex items-center justify-center rounded border"
      style={{ color, borderColor: color, background: 'rgba(0,0,0,0.25)' }}
      title={`穿透等级 ${pen} 级`}
    >
      {pen}
    </span>
  );
}

function DmgBar({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="num text-sm font-semibold" style={{ color }}>
        {Math.round(ratio * 100)}%
      </span>
      <div className="hidden lg:block w-14 h-1 bg-bg rounded overflow-hidden">
        <div className="h-full rounded" style={{ width: `${Math.min(ratio * 100, 140) / 1.4}%`, background: color }} />
      </div>
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
        if (tier !== '全部' && String(a.tier) !== tier) return false;
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

  return (
    <div className="flex flex-col md:flex-row gap-4">
      {/* 筛选栏 */}
      <aside className="md:w-48 md:shrink-0 md:sticky md:top-20 self-start">
        <div className="tac-panel p-3 space-y-3">
          {[
            { label: '口径', value: caliber, set: setCaliber, opts: calibers },
            { label: '穿透等级', value: pen, set: setPen, opts: ['全部', '0', '1', '2', '3', '4', '5', '6', '7'] },
            { label: '品阶', value: tier, set: setTier, opts: ['全部', '1', '2', '3', '4', '5'] },
          ].map((f) => (
            <label key={f.label} className="block">
              <span className="text-xs text-muted">{f.label}</span>
              <select
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                className="num w-full mt-1 bg-bg border border-edge rounded px-2 py-1.5 text-sm outline-none focus:border-accent"
              >
                {f.opts.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
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
          <p className="num text-[11px] text-muted leading-relaxed pt-1 border-t border-edge">
            共 {filtered.length} 种
            <br />
            穿透等级即玩家俗称的「N级弹」
          </p>
        </div>
      </aside>

      {/* 分组表格 */}
      <div className="flex-1 space-y-6">
        {grouped.map(([cal, list]) => (
          <section key={cal} className="tac-panel overflow-hidden">
            <h2 className="num text-sm text-accent px-4 py-2.5 border-b border-edge flex items-center gap-2">
              {cal}
              <span className="text-muted">({list.length} 种)</span>
              <span className="flex-1" />
              <Link href="/ammo/matrix" className="text-[11px] text-muted hover:text-accent">
                穿甲对照 →
              </Link>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="px-4 py-2 text-left font-normal">弹药（口径 + 型号）</th>
                    <th className="px-3 py-2 text-center font-normal">穿透</th>
                    <th className="px-3 py-2 text-left font-normal">肉体伤害</th>
                    <th className="px-3 py-2 text-left font-normal">护甲伤害</th>
                    <th className="px-4 py-2 text-right font-normal">适用枪械</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((a) => (
                    <tr
                      key={a.id}
                      onClick={() => setSelected(a)}
                      className="border-t border-edge cursor-pointer hover:bg-panel-hi/60 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-1 h-6 rounded-sm shrink-0"
                            style={{ background: a.tier ? TIER_COLOR[a.tier - 1] : 'var(--t1)' }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium num">{a.name}</span>
                              {a.season_limited === 1 && (
                                <span className="badge !text-danger !border-danger/40">赛季限定</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="num text-[11px] text-muted">{a.caliber}</span>
                              <TierBadge a={a} />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <PenBadge pen={a.pen_level} />
                      </td>
                      <td className="px-3 py-2.5">
                        <DmgBar ratio={a.dmg_ratio} color={a.dmg_ratio >= 1.1 ? 'var(--t5)' : a.dmg_ratio < 1 ? 'var(--muted)' : 'var(--text)'} />
                      </td>
                      <td className="px-3 py-2.5">
                        <DmgBar ratio={a.armor_ratio} color={a.armor_ratio >= 1.1 ? 'var(--t5)' : a.armor_ratio < 1 ? 'var(--muted)' : 'var(--info)'} />
                      </td>
                      <td className="px-4 py-2.5 text-right num text-xs text-muted">
                        {(a.weaponNames?.split('、').length ?? 0)} 把
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
        {!filtered.length && <p className="text-muted text-sm py-10 text-center">没有符合条件的弹药</p>}
      </div>

      {/* 详情侧滑抽屉 */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 anim-fade" onClick={() => setSelected(null)}>
          <div
            className="absolute right-0 top-0 h-full w-full sm:w-96 bg-panel border-l border-edge p-6 overflow-y-auto anim-slide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold num">{selected.name}</h3>
                <p className="num text-xs text-muted mt-0.5">
                  {selected.caliber} · {selected.rarity}阶
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-muted hover:text-accent text-2xl leading-none">
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="tac-panel p-3 text-center">
                <p className="text-[11px] text-muted">穿透等级</p>
                <div className="mt-1 flex justify-center">
                  <PenBadge pen={selected.pen_level} />
                </div>
              </div>
              <div className="tac-panel p-3 text-center">
                <p className="text-[11px] text-muted">品阶</p>
                <p className="num text-lg font-bold mt-1" style={{ color: selected.tier ? TIER_COLOR[selected.tier - 1] : 'var(--t1)' }}>
                  {selected.tier ?? '?'} 阶
                </p>
              </div>
              <div className="tac-panel p-3 text-center">
                <p className="text-[11px] text-muted">肉体伤害倍率</p>
                <p className="num text-lg font-bold mt-1">{Math.round(selected.dmg_ratio * 100)}%</p>
              </div>
              <div className="tac-panel p-3 text-center">
                <p className="text-[11px] text-muted">护甲伤害倍率</p>
                <p className="num text-lg font-bold mt-1">{Math.round(selected.armor_ratio * 100)}%</p>
              </div>
            </div>

            {selected.season_limited === 1 && (
              <p className="mt-3 text-xs text-danger">⚠ 赛季限定弹药</p>
            )}

            <h4 className="text-sm font-bold mt-5 mb-2 flex items-center gap-2">
              适用枪械 <span className="flex-1 h-px bg-edge" />
            </h4>
            <p className="text-sm text-muted leading-relaxed">
              {selected.weaponNames || '（无挂枪记录，可能为手枪弹或特殊弹药）'}
            </p>

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
