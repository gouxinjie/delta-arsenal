/**
 * @component WeaponDrawer
 * @description 武器详情抽屉：从右侧滑出，展示可用子弹、枪械属性（带进度条刻度）与可改装槽位，替代原先跳转详情页
 * @author gouxinjie
 * @created 2026-11-25
 * @updated 2026-11-26
 */
'use client';

import Link from 'next/link';
import Drawer from '@/components/commons/Drawer';
import SmartImage from '@/components/commons/SmartImage';
import { AMMO_EFFECT_TONE, CALIBER_ICON, SLOT_NAMES, ammoColor } from '@/constants/game';
import {
  WEAPON_BAR_STAT_KEYS,
  WEAPON_STAT_META,
  WEAPON_VALUE_ROW_KEYS,
} from '@/constants/weapon';
import { describeAmmoEffects } from '@/lib/ammo-effects';
import { formatPercent } from '@/lib/format';
import { IconAmmo, IconRifle } from '@/components/commons/icons';
import type { WeaponAmmoBrief, WeaponDetail, WeaponNumericKey } from '@/types/weapon';

/** WeaponDrawer 组件入参 */
interface WeaponDrawerProps {
  /** 当前打开的武器，null 表示抽屉关闭 */
  weapon: WeaponDetail | null;
  /** 各数值字段在全库中的最大值，用于进度条刻度（缺省按 0 处理） */
  statMax: Partial<Record<WeaponNumericKey, number>>;
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

/**
 * 弹药磁贴：口径贴图 + 型号名 + 穿透等级，点击跳转弹药库检索
 * 有命中特效（燃烧 / 爆裂）时，右上角叠加一枚迷你标签，悬浮可看完整参数
 * @param ammo - 弹药摘要数据
 * @param onClose - 抽屉关闭回调（跳转前收起抽屉）
 */
function AmmoTile({ ammo, onClose }: { ammo: WeaponAmmoBrief; onClose: () => void }) {
  const color = ammoColor(ammo);
  const src = CALIBER_ICON[ammo.caliber] ?? '';
  const effects = describeAmmoEffects(ammo.effects);
  const effectText = effects.map((e) => e.detail).join(' ');
  return (
    <Link
      href={`/ammo?ammo=${ammo.id}`}
      onClick={onClose}
      title={`${ammo.name} · 穿透 ${ammo.pen_level} 级 · 肉伤 ${formatPercent(ammo.dmg_ratio)}${effectText ? ` · ${effectText}` : ''}`}
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
        <SmartImage
          src={src}
          alt={ammo.caliber}
          className="max-h-full max-w-full object-contain"
          fallback={<IconAmmo className="w-6 h-6" />}
        />
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

export default function WeaponDrawer({ weapon, statMax, onClose }: WeaponDrawerProps) {
  /**
   * 「其它参数」：纯数值行 + 开火模式（行顺序见 constants/weapon）
   * 标签与单位统一取自 WEAPON_STAT_META，避免与图鉴卡片两套文案
   */
  const valueRows = WEAPON_VALUE_ROW_KEYS.map((key) => {
    if (key === 'fireModes') {
      const modes = weapon?.panel.fireModes;
      return { key, label: '开火模式', value: modes?.length ? modes.join('/') : '—' };
    }
    const meta = WEAPON_STAT_META[key];
    const raw = weapon?.panel[key];
    return { key, label: meta.label, value: raw != null ? `${raw}${meta.unit ?? ''}` : '—' };
  });

  return (
    // 关闭动画期间 Drawer 会保留最后一次内容，因此这里无需自己缓存 shown 状态
    <Drawer
      open={!!weapon}
      onClose={onClose}
      ariaLabel={`${weapon?.name ?? '武器'} 详情`}
      panelClassName="sm:max-w-[560px]"
      overlay="soft"
    >
      {weapon && (
        <>
          {/* 头部：缩略图 + 名称 + 类别/口径标签 + 数据速览（关闭按钮由 Drawer 提供，右侧留白避让） */}
          <header className="relative shrink-0 px-4 pr-12 pt-4 pb-3.5 border-b border-edge bg-gradient-to-b from-panel-hi/60 to-transparent sm:px-5 sm:pr-14 sm:pt-5 sm:pb-4">
            <div className="flex items-start gap-3">
              {/* 缩略图：径向底纹 + 图片投影，与卡片图区保持同一视觉语言（窄屏缩一号，给文字让位） */}
              <div className="thumb-bg w-20 h-14 sm:w-28 sm:h-[68px] shrink-0 flex items-center justify-center bg-bg border border-edge/70 rounded px-1.5 sm:px-2">
                <SmartImage
                  src={weapon.image}
                  alt={weapon.name}
                  className="weapon-img max-h-full max-w-full object-contain"
                  fallback={
                    <span className="text-muted/30">
                      <IconRifle className="w-10 h-10" />
                    </span>
                  }
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold truncate leading-tight">{weapon.name}</h2>
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
            </div>
          </header>

          {/* 内容区：可滚动，底部预留 iPhone 横条安全区 */}
          <div className="flex-1 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-5 sm:px-5">
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
                    {WEAPON_BAR_STAT_KEYS.map((key) => {
                      const meta = WEAPON_STAT_META[key];
                      const raw = weapon.panel[key];
                      const value = raw ?? null;
                      const max = statMax[key] ?? 0;
                      const pct = value != null && max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
                      return (
                        <div key={key} className="flex items-center gap-2 h-7">
                          <span className="text-[11px] text-muted w-[70px] shrink-0 whitespace-nowrap">{meta.label}</span>
                          <span className="flex-1 h-1.5 rounded-full bg-edge/80 overflow-hidden">
                            <span
                              className="block h-full rounded-full bg-gradient-to-r from-accent/40 to-accent [box-shadow:var(--bar-glow)]"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="num text-[13px] font-medium text-main w-12 text-right shrink-0">
                            {value ?? '—'}
                            {value != null && meta.unit ? meta.unit : ''}
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
                        key={r.key}
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

            {/* 卡片点击与键盘激活都打开弹层，详情页成了「只有改地址才能进」；
                这里给出显式入口，保证详情页有可用路径（弹层内容仅客户端渲染，仅服务键盘/鼠标可达性） */}
            <Link
              href={`/weapons/${weapon.id}`}
              onClick={onClose}
              className="block rounded border border-edge py-2 text-center text-xs text-muted transition-colors hover:border-accent hover:text-accent"
            >
              查看完整详情页 →
            </Link>

            {/* 免责声明：与正文拉开层级，弱化到次要文字色 */}
            <p className="text-[11px] text-muted/80 leading-relaxed border-t border-edge/60 pt-3">
              面板数值来自官方数据源，不同来源枪械字段完整度略有差异。仅供参考，以游戏内实测为准。
            </p>
          </div>
        </>
      )}
    </Drawer>
  );
}
