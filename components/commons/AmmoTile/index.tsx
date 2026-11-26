/**
 * @component AmmoTile
 * @description 弹药磁贴：口径贴图 + 型号名 + 穿透等级，点击跳转弹药库并定位到该型号；
 *              武器详情抽屉（窄）与武器详情页（宽）共用，hover / 键盘聚焦时描边按弹药品阶色提亮
 * @author gouxinjie
 * @created 2026-11-26
 * @updated 2026-11-26
 */
import type { CSSProperties } from 'react';
import Link from 'next/link';
import SmartImage from '@/components/commons/SmartImage';
import { IconAmmo } from '@/components/commons/icons';
import { AMMO_EFFECT_TONE, CALIBER_ICON, ammoColor } from '@/constants/game';
import { describeAmmoEffects } from '@/lib/ammo-effects';
import { formatPercent } from '@/lib/format';
import type { WeaponAmmoBrief } from '@/types/weapon';

/** 磁贴尺寸档位 */
export type AmmoTileSize = 'sm' | 'md';

/** AmmoTile 组件入参 */
interface AmmoTileProps {
  /** 弹药摘要（型号 / 口径 / 穿透 / 肉伤 / 命中特效） */
  ammo: WeaponAmmoBrief;
  /** 跳转前的回调（如收起所在的武器抽屉），无则不传 */
  onNavigate?: () => void;
  /** 尺寸档位：sm=抽屉内紧凑磁贴，md=详情页稍大磁贴，默认 sm */
  size?: AmmoTileSize;
}

/**
 * 尺寸档位 -> 类名
 * @description 抽屉可用宽度窄，贴图区压到 40px；详情页宽裕，贴图区抬高并放大字号
 */
const SIZE_CLASS: Record<AmmoTileSize, { image: string; name: string; pen: string }> = {
  sm: { image: 'h-10', name: 'text-[11px]', pen: 'text-[10px] leading-4' },
  md: {
    image: 'h-12 sm:h-14',
    name: 'text-[11px] sm:text-xs',
    pen: 'text-[10px] leading-4 sm:text-[11px] sm:leading-5',
  },
};

export default function AmmoTile({ ammo, onNavigate, size = 'sm' }: AmmoTileProps) {
  const color = ammoColor(ammo);
  const src = CALIBER_ICON[ammo.caliber] ?? '';
  const effects = describeAmmoEffects(ammo.effects);
  const effectText = effects.map((e) => e.detail).join(' ');
  const cls = SIZE_CLASS[size];

  return (
    // 描边取弹药品阶色的低透明度版本，hover / 键盘聚焦时提亮到满色（品阶色由行内 --tone 注入）
    <Link
      href={`/ammo?ammo=${ammo.id}`}
      onClick={onNavigate}
      title={`${ammo.name} · 穿透 ${ammo.pen_level} 级 · 肉伤 ${formatPercent(ammo.dmg_ratio)}${effectText ? ` · ${effectText}` : ''}`}
      className="relative flex flex-col items-center gap-1 pt-2 pb-1.5 px-1.5 rounded border bg-bg/60 overflow-hidden transition-[border-color,box-shadow] duration-150 [border-color:color-mix(in_srgb,var(--tone)_40%,transparent)] hover:[border-color:var(--tone)] hover:[box-shadow:0_0_0_1px_color-mix(in_srgb,var(--tone)_45%,transparent)] focus-visible:outline-none focus-visible:[border-color:var(--tone)] focus-visible:[box-shadow:0_0_0_1px_color-mix(in_srgb,var(--tone)_45%,transparent)]"
      style={{ '--tone': color } as CSSProperties}
    >
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
      {/* 贴图区：同档位统一高度，保证磁贴等高 */}
      <span className={`${cls.image} w-full flex items-center justify-center overflow-hidden`}>
        <SmartImage
          src={src}
          alt={ammo.caliber}
          className="max-h-full max-w-full object-contain"
          fallback={<IconAmmo className="w-6 h-6" />}
        />
      </span>
      <span className={`${cls.name} leading-tight text-center text-muted line-clamp-2`}>{ammo.name}</span>
      <span
        className={`num ${cls.pen} px-1.5 rounded-[3px]`}
        style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
      >
        穿透 {ammo.pen_level}
      </span>
    </Link>
  );
}
