/**
 * @component WeaponDrawer
 * @description 武器详情抽屉：从左侧滑出，展示可用子弹、枪械属性（带进度条刻度）与可改装槽位，替代原先跳转详情页
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-25
 */
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AMMO_EFFECT_TONE, CALIBER_ICON, SLOT_NAMES } from '@/constants/game';
import { describeAmmoEffects } from '@/lib/ammo-effects';
import { IconAmmo, IconRifle } from '@/components/commons/icons';
import type { WeaponDetail, WeaponPanel } from '@/types/weapon';

/** 品阶文字/描边颜色（白绿蓝紫金） */
const TIER_COLOR = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)'];

/** 左列属性：带进度条，数值按全库最大值等比填充 */
const BAR_STATS: { key: keyof WeaponPanel; label: string; unit?: string }[] = [
  { key: 'meatHarm', label: '基础伤害' },
  { key: 'effectiveRange', label: '优势射程', unit: '米' },
  { key: 'recoil', label: '后坐力控制' },
  { key: 'control', label: '操控速度' },
  { key: 'stability', label: '武器稳定性' },
  { key: 'hipFire', label: '腰射精度' },
];

/** WeaponDrawer 组件入参 */
interface WeaponDrawerProps {
  /** 当前打开的武器，null 表示抽屉关闭 */
  weapon: WeaponDetail | null;
  /** 各面板字段在全库中的最大值，用于进度条刻度（缺省按 0 处理） */
  statMax: Record<string, number>;
  /** 关闭抽屉回调 */
  onClose: () => void;
}

/** 分区标题：左侧青绿竖条 + 标题 + 可选计数 */
function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-accent mb-3">
      <span className="w-1 h-3.5 rounded-sm bg-accent" aria-hidden="true" />
      {title}
      {count !== undefined && <span className="num text-[11px] text-muted">({count})</span>}
    </h3>
  );
}

/** 品阶色（tier 缺省时回退白色） */
function tierColor(tier: number | null): string {
  return tier ? TIER_COLOR[tier - 1] : 'var(--t1)';
}

/**
 * 弹药磁贴：口径贴图 + 型号名 + 穿透等级，点击跳转弹药库检索
 * 有命中特效（燃烧 / 爆裂）时，右上角叠加一枚迷你标签，悬浮可看完整参数
 * @param ammo - 弹药摘要数据
 * @param onClose - 抽屉关闭回调（跳转前收起抽屉）
 */
function AmmoTile({ ammo, onClose }: { ammo: WeaponDetail['ammo'][number]; onClose: () => void }) {
  const color = tierColor(ammo.tier);
  const src = CALIBER_ICON[ammo.caliber];
  const effects = describeAmmoEffects(ammo.effects);
  const effectText = effects.map((e) => e.detail).join(' ');
  return (
    <Link
      href={`/ammo?q=${encodeURIComponent(ammo.name)}`}
      onClick={onClose}
      title={`${ammo.name} · 穿透 ${ammo.pen_level} 级 · 肉伤 ${Math.round(ammo.dmg_ratio * 100)}%${effectText ? ` · ${effectText}` : ''}`}
      className="group/tile relative flex flex-col items-center gap-1 p-1.5 rounded border bg-bg/60 hover:bg-panel-hi transition-colors"
      style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}
    >
      {/* 特效角标：磁贴空间有限，只放类型名，完整参数走 title */}
      {effects.length > 0 && (
        <span
          className="absolute right-0.5 top-0.5 rounded border bg-bg px-1 text-[9px] leading-[14px] pointer-events-none"
          style={{ color: AMMO_EFFECT_TONE[effects[0].key], borderColor: AMMO_EFFECT_TONE[effects[0].key] }}
          aria-hidden="true"
        >
          {effects[0].label}
        </span>
      )}
      {/* 贴图区：统一高度保证磁贴等高 */}
      <span className="h-10 w-full flex items-center justify-center overflow-hidden">
        {src ? (
          <img
            src={src}
            alt={ammo.caliber}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
          />
        ) : (
          <IconAmmo className="w-6 h-6" />
        )}
      </span>
      <span className="text-[11px] leading-tight text-center text-muted group-hover/tile:text-main line-clamp-2">
        {ammo.name}
      </span>
      <span className="num text-[11px]" style={{ color }}>
        穿透 {ammo.pen_level}
      </span>
    </Link>
  );
}

export default function WeaponDrawer({ weapon, statMax, onClose }: WeaponDrawerProps) {
  // 打开时锁定页面滚动 + 支持 Esc 关闭
  useEffect(() => {
    if (!weapon) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    // 锁定滚动会让滚动条消失、可用宽度增加，需补偿同等宽度，避免页面内容横向抖动
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [weapon, onClose]);

  if (!weapon) return null;

  const panel = weapon.panel;

  /** 右列属性：只展示数值（对齐参考图，数值用强调色右对齐） */
  const valueRows: { label: string; value: string }[] = [
    { label: '护甲伤害', value: panel.armorHarm != null ? String(panel.armorHarm) : '—' },
    { label: '射速', value: panel.fireRate != null ? `${panel.fireRate}/分钟` : '—' },
    { label: '容量', value: panel.magSize != null ? String(panel.magSize) : '—' },
    { label: '开火模式', value: panel.fireModes?.length ? panel.fireModes.join('/') : '—' },
    { label: '枪口初速', value: panel.muzzleVelocity != null ? `${panel.muzzleVelocity}/秒` : '—' },
    { label: '枪声传播距离', value: panel.soundRadius != null ? `${panel.soundRadius}米` : '—' },
  ];

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩：轻量压暗，保留背景可辨识度，点击关闭 */}
      <div className="absolute inset-0 bg-[color:var(--overlay-soft)] anim-fade" onClick={onClose} aria-hidden="true" />

      {/* 抽屉主体：右侧滑出 */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${weapon.name} 详情`}
        className="absolute right-0 top-0 h-full w-full sm:max-w-[560px] bg-panel border-l border-edge [box-shadow:var(--drawer-shadow)] flex flex-col anim-drawer-right"
      >
        {/* 头部：缩略图 + 名称 + 类别口径 + 关闭按钮 */}
        <header className="relative shrink-0 px-5 pt-5 pb-4 border-b border-edge">
          <div className="flex items-start gap-3">
            <div className="w-24 h-16 shrink-0 flex items-center justify-center bg-bg border border-edge/70 rounded px-1.5">
              {weapon.image ? (
                <img src={weapon.image} alt={weapon.name} className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-muted/30">
                  <IconRifle className="w-10 h-10" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold truncate">{weapon.name}</h2>
              <p className="num text-xs text-muted mt-0.5 truncate">
                {weapon.category} · {weapon.caliber || '—'}
              </p>
              <p className="num text-[11px] text-muted mt-1">
                可用弹药 <b className="text-accent">{weapon.ammo.length}</b> 种 · 改装槽位{' '}
                <b className="text-accent">{weapon.slots.length}</b> 个
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="关闭详情"
              className="shrink-0 -mt-1 -mr-1 w-7 h-7 flex items-center justify-center text-xl leading-none rounded text-muted hover:text-accent hover:bg-panel-hi transition-colors"
            >
              ×
            </button>
          </div>
        </header>

        {/* 内容区：可滚动 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 可用子弹 */}
          <section>
            <SectionTitle title="可用子弹" count={weapon.ammo.length} />
            {weapon.ammo.length ? (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                {weapon.ammo.map((a) => (
                  <AmmoTile key={a.id} ammo={a} onClose={onClose} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">暂无关联弹药数据（补充源枪械可能缺失关联）</p>
            )}
          </section>

          {/* 枪械属性：左右两列逐行配对，行高 / 标签字号 / 数值字号统一（大屏列优先，小屏先左后右分组） */}
          <section className="border-t border-edge/60 pt-4">
            <SectionTitle title="枪械属性" />
            <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-6 sm:grid-flow-col gap-x-4 gap-y-1">
              {/* 左列：进度条 + 数值 */}
              {BAR_STATS.map((s) => {
                const raw = panel[s.key];
                const value = typeof raw === 'number' ? raw : null;
                const max = statMax[s.key] ?? 0;
                const pct = value != null && max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
                return (
                  <div key={s.key} className="flex items-center gap-2 h-7">
                    <span className="text-[11px] text-muted w-16 shrink-0 whitespace-nowrap">{s.label}</span>
                    <span className="flex-1 h-1 rounded-full bg-edge overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-accent/40 to-accent [box-shadow:var(--bar-glow)]"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="num text-[13px] text-main w-12 text-right shrink-0">
                      {value ?? '—'}
                      {value != null && s.unit ? s.unit : ''}
                    </span>
                  </div>
                );
              })}
              {/* 右列：纯数值行，无边框底色，与左侧行高 / 字号 / 对齐方式完全一致 */}
              {valueRows.map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-2 h-7">
                  <span className="text-[11px] text-muted whitespace-nowrap">{r.label}</span>
                  <span className="num text-[13px] text-accent truncate">{r.value}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 可改装槽位（数据源无改枪方案，展示槽位清单） */}
          <section className="border-t border-edge/60 pt-4">
            <SectionTitle title="可改装槽位" count={weapon.slots.length} />
            {weapon.slots.length ? (
              <div className="flex flex-wrap gap-1.5">
                {weapon.slots.map((s) => (
                  <span
                    key={s}
                    className="num text-[11px] border border-edge rounded px-2 py-1 text-muted hover:border-accent/60 hover:text-main transition-colors"
                  >
                    {SLOT_NAMES[s] ?? `槽位 ${s}`}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">暂无槽位数据（补充源枪械）</p>
            )}
          </section>

          <p className="text-[11px] text-muted leading-relaxed border-t border-edge/60 pt-3">
            面板数值来自官方数据源，不同来源枪械字段完整度略有差异。仅供参考，以游戏内实测为准。
          </p>
        </div>
      </aside>
    </div>
  );
}
