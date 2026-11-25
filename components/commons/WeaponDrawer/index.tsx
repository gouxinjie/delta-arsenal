/**
 * @component WeaponDrawer
 * @description 武器详情抽屉：从右侧滑出，展示可用子弹、枪械属性（带进度条刻度）与可改装槽位，替代原先跳转详情页
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-25
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AMMO_EFFECT_TONE, CALIBER_ICON, SLOT_NAMES } from '@/constants/game';
import { describeAmmoEffects } from '@/lib/ammo-effects';
import { IconAmmo, IconRifle } from '@/components/commons/icons';
import type { WeaponDetail, WeaponPanel } from '@/types/weapon';

/** 品阶文字/描边颜色（白绿蓝紫金） */
const TIER_COLOR = ['var(--t1)', 'var(--t2)', 'var(--t3)', 'var(--t4)', 'var(--t5)'];

/** 抽屉进入 / 退场过渡时长（毫秒）：抽屉位移、遮罩淡出与卸载定时器共用，避免三者不同步 */
const DRAWER_ANIM_MS = 300;

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

/** 分区标题：左侧青绿竖条 + 标题 + 右侧计数徽章 */
function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <h3 className="flex items-center gap-2 text-[13px] font-semibold text-accent mb-3">
      <span className="w-1 h-3.5 rounded-sm bg-accent [box-shadow:var(--tab-glow)]" aria-hidden="true" />
      {title}
      {count !== undefined && (
        <span className="num ml-auto px-1.5 py-0.5 rounded text-[10px] font-normal text-muted bg-bg border border-edge/70">
          {count}
        </span>
      )}
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
      className="relative flex flex-col items-center gap-1 pt-2 pb-1.5 px-1.5 rounded border bg-bg/60 overflow-hidden"
      style={{ borderColor: `color-mix(in srgb, ${color} 40%, transparent)` }}
    >
      {/* 顶部品阶色条：比整块描边更能一眼区分弹药品阶 */}
      <span className="absolute inset-x-0 top-0 h-0.5 opacity-70" style={{ background: color }} aria-hidden="true" />
      {/* 特效角标：磁贴空间有限，只放类型名，完整参数走 title */}
      {effects.length > 0 && (
        <span
          className="absolute right-0.5 top-1.5 rounded border bg-bg px-1 text-[9px] leading-[14px] pointer-events-none"
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
      <span className="text-[11px] leading-tight text-center text-muted line-clamp-2">{ammo.name}</span>
      <span
        className="num text-[10px] leading-4 px-1.5 rounded-[3px]"
        style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
      >
        穿透 {ammo.pen_level}
      </span>
    </Link>
  );
}

export default function WeaponDrawer({ weapon: incomingWeapon, statMax, onClose }: WeaponDrawerProps) {
  /** 参与渲染的武器数据：关闭后保留到退场动画结束，避免内容在滑出途中被清空 */
  const [shown, setShown] = useState<WeaponDetail | null>(incomingWeapon);
  /** 展开态：驱动进入 / 退场过渡（false 时抽屉在屏幕外、遮罩透明） */
  const [open, setOpen] = useState(false);

  // 入参变化：打开则先挂载内容再切展开态，关闭则先收起、动画结束后卸载
  useEffect(() => {
    if (incomingWeapon) {
      // 打开：第 1 帧挂载出「屏幕外」初始态，第 2 帧再切展开态；
      // 同一任务内直接切换会被浏览器合并，transition 不触发（表现为无入场动效）
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        setShown(incomingWeapon);
        raf2 = requestAnimationFrame(() => setOpen(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    // 关闭：收起放到宏任务，避免在 effect 内同步 setState 引发级联渲染
    const collapseTimer = setTimeout(() => setOpen(false), 0);
    const unmountTimer = setTimeout(() => setShown(null), DRAWER_ANIM_MS);
    return () => {
      clearTimeout(collapseTimer);
      clearTimeout(unmountTimer);
    };
  }, [incomingWeapon]);

  // 打开时锁定页面滚动 + 支持 Esc 关闭（退场动画期间仍保持锁定，卸载时恢复）
  useEffect(() => {
    if (!shown) return;
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
  }, [shown, onClose]);

  if (!shown) return null;

  const weapon = shown;
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
      {/* 遮罩：轻量压暗，保留背景可辨识度，点击关闭；随抽屉一同淡入淡出 */}
      <div
        className={`absolute inset-0 bg-[color:var(--overlay-soft)] ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{ transition: `opacity ${DRAWER_ANIM_MS}ms ease-out` }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 抽屉主体：右侧滑入，关闭时原路滑出（位移用内联 transform，避免不同版本 translate 工具类口径差异） */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`${weapon.name} 详情`}
        aria-hidden={!open}
        style={{
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform ${DRAWER_ANIM_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`,
        }}
        className={`absolute right-0 top-0 h-full w-full sm:max-w-[560px] bg-panel border-l border-edge [box-shadow:var(--drawer-shadow)] flex flex-col ${
          open ? '' : 'pointer-events-none'
        }`}
      >
        {/* 头部：缩略图 + 名称 + 类别/口径标签 + 数据速览 + 关闭按钮 */}
        <header className="relative shrink-0 px-5 pt-5 pb-4 border-b border-edge bg-gradient-to-b from-panel-hi/60 to-transparent">
          <div className="flex items-start gap-3.5">
            {/* 缩略图：径向底纹 + 图片投影，与卡片图区保持同一视觉语言 */}
            <div className="thumb-bg w-24 h-16 sm:w-28 sm:h-[68px] shrink-0 flex items-center justify-center bg-bg border border-edge/70 rounded px-2">
              {weapon.image ? (
                <img
                  src={weapon.image}
                  alt={weapon.name}
                  className="weapon-img max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="text-muted/30">
                  <IconRifle className="w-10 h-10" />
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold truncate leading-tight">{weapon.name}</h2>
              {/* 类别用中性描边标签、口径用强调色标签：与图鉴卡片的高亮口径呼应 */}
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className="text-[11px] px-1.5 py-px rounded border border-edge/70 bg-bg/60 text-muted">
                  {weapon.category}
                </span>
                <span className="num text-[11px] px-1.5 py-px rounded bg-accent/10 text-accent font-medium">
                  {weapon.caliber || '—'}
                </span>
              </div>
              <p className="num text-[11px] text-muted mt-2 flex items-center gap-2">
                <span>
                  可用弹药 <b className="text-accent font-semibold">{weapon.ammo.length}</b>
                </span>
                <span className="w-px h-3 bg-edge" aria-hidden="true" />
                <span>
                  改装槽位 <b className="text-accent font-semibold">{weapon.slots.length}</b>
                </span>
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="关闭详情"
              className="shrink-0 -mt-1 -mr-1 w-8 h-8 flex items-center justify-center text-lg leading-none rounded-full text-muted hover:text-accent hover:bg-panel-hi transition-colors"
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

          {/* 枪械属性：拆成「核心性能（进度条）」与「其它参数（纯数值）」两组，竖线分隔，避免两列数字混读 */}
          <section className="border-t border-edge/60 pt-4">
            <SectionTitle title="枪械属性" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3">
              {/* 左组：进度条 + 数值（进度条 1.5px，读数与刻度更易对齐） */}
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.06em] text-muted mb-2">
                  <span className="w-1.5 h-1.5 rounded-[1px] bg-accent" aria-hidden="true" />
                  核心性能
                </p>
                <div className="space-y-0.5">
                  {BAR_STATS.map((s) => {
                    const raw = panel[s.key];
                    const value = typeof raw === 'number' ? raw : null;
                    const max = statMax[s.key] ?? 0;
                    const pct = value != null && max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
                    return (
                      <div key={s.key} className="flex items-center gap-2 h-7">
                        <span className="text-[11px] text-muted w-[70px] shrink-0 whitespace-nowrap">{s.label}</span>
                        <span className="flex-1 h-1.5 rounded-full bg-edge/80 overflow-hidden">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-accent/40 to-accent [box-shadow:var(--bar-glow)]"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="num text-[13px] font-medium text-main w-12 text-right shrink-0">
                          {value ?? '—'}
                          {value != null && s.unit ? s.unit : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 右组：纯数值行，淡横线分条，与左侧进度条组形成两种信息密度 */}
              <div className="sm:border-l sm:border-edge/60 sm:pl-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.06em] text-muted mb-2">
                  <span className="w-1.5 h-1.5 rounded-[1px] bg-info" aria-hidden="true" />
                  其它参数
                </p>
                <div className="space-y-0.5">
                  {valueRows.map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between gap-2 h-7 px-1 -mx-1 rounded border-b border-edge/40 last:border-b-0"
                    >
                      <span className="text-[11px] text-muted whitespace-nowrap">{r.label}</span>
                      <span className="num text-[13px] text-accent truncate">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
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
                    className="num text-[11px] border border-edge rounded px-2 py-1 bg-bg/40 text-muted hover:border-accent/60 hover:text-main hover:bg-panel-hi transition-colors"
                  >
                    {SLOT_NAMES[s] ?? `槽位 ${s}`}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">暂无槽位数据（补充源枪械）</p>
            )}
          </section>

          {/* 免责声明：与正文拉开层级，弱化到次要文字色 */}
          <p className="text-[11px] text-muted/80 leading-relaxed border-t border-edge/60 pt-3">
            面板数值来自官方数据源，不同来源枪械字段完整度略有差异。仅供参考，以游戏内实测为准。
          </p>
        </div>
      </aside>
    </div>
  );
}
