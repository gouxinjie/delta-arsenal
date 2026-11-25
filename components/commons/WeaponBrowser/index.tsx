/**
 * @component WeaponBrowser
 * @description 武器图鉴浏览器：按类型 Tab（带图标 + 计数）筛选，卡片网格展示，图片懒加载并处理加载失败占位
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-24
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  IconGrid,
  IconRifle,
  IconSmg,
  IconDmr,
  IconSniper,
  IconLmg,
  IconShotgun,
  IconPistol,
  IconUnknown,
} from '@/components/commons/icons';

/** 卡片武器图：无图或加载失败时显示枪械剪影占位（配合数据源图片缺失场景） */
function WeaponImage({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(!src);
  if (err) {
    return (
      <span className="flex items-center justify-center text-muted/30">
        <IconRifle className="w-12 h-12" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="max-h-full max-w-full object-contain opacity-90 transition-all duration-300 group-hover:opacity-100 group-hover:scale-105 drop-shadow-[0_3px_8px_rgba(47,227,164,0.1)] group-hover:drop-shadow-[0_5px_14px_rgba(47,227,164,0.2)]"
      onError={() => setErr(true)}
    />
  );
}

/** 武器卡片展示模型 */
interface WeaponCard {
  /** 武器 objectID */
  id: string;
  /** 武器名称 */
  name: string;
  /** 类别（步枪/冲锋枪等） */
  category: string;
  /** 口径 */
  caliber: string;
  /** 本地图片路径 */
  image: string;
  /** 面板参数（与武器详情页 panel 字段同源，缺值按 '—' 展示） */
  panel: {
    /** 肉体伤害 */
    meatHarm?: number;
    /** 护甲伤害 */
    armorHarm?: number;
    /** 射速（发/分） */
    fireRate?: number;
    /** 有效射程 */
    effectiveRange?: number;
    /** 后坐力 */
    recoil?: number;
    /** 操控 */
    control?: number;
    /** 稳定性 */
    stability?: number;
    /** 腰射精度 */
    hipFire?: number;
  };
}

/** 卡片参数栏配置：8 项等宽平铺（对齐参考图排版） */
const CARD_STATS: { key: keyof WeaponCard['panel']; label: string }[] = [
  { key: 'meatHarm', label: '肉伤' },
  { key: 'armorHarm', label: '甲伤' },
  { key: 'fireRate', label: '射速' },
  { key: 'effectiveRange', label: '射程' },
  { key: 'recoil', label: '后座' },
  { key: 'control', label: '操控' },
  { key: 'stability', label: '稳定' },
  { key: 'hipFire', label: '腰射' },
];

/** 分类 Tab 配置：标签 + 图标（图标按当前色继承） */
const TABS: { label: string; icon: (cls: string) => React.ReactNode }[] = [
  { label: '全部', icon: (c) => <IconGrid className={c} /> },
  { label: '步枪', icon: (c) => <IconRifle className={c} /> },
  { label: '冲锋枪', icon: (c) => <IconSmg className={c} /> },
  { label: '精确射手步枪', icon: (c) => <IconDmr className={c} /> },
  { label: '狙击步枪', icon: (c) => <IconSniper className={c} /> },
  { label: '轻机枪', icon: (c) => <IconLmg className={c} /> },
  { label: '霰弹枪', icon: (c) => <IconShotgun className={c} /> },
  { label: '手枪', icon: (c) => <IconPistol className={c} /> },
  { label: '未知', icon: (c) => <IconUnknown className={c} /> },
];

/** 运营标记的热门武器（图鉴首页展示 🔥 热门角标） */
const HOT_WEAPONS = new Set(['MP5冲锋枪', 'M4A1突击步枪', 'AK-12突击步枪', 'P90冲锋枪']);

/** WeaponBrowser 组件入参 */
interface WeaponBrowserProps {
  /** 武器列表 */
  weapons: WeaponCard[];
}

export default function WeaponBrowser({ weapons }: WeaponBrowserProps) {
  const [tab, setTab] = useState('全部');
  const list = useMemo(
    () => (tab === '全部' ? weapons : weapons.filter((w) => w.category === tab)),
    [weapons, tab]
  );

  return (
    <div>
      {/* 分类 Tab：胶囊按钮，选中青绿填充 */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {TABS.map((t) => {
          const active = tab === t.label;
          const count = t.label === '全部' ? weapons.length : weapons.filter((w) => w.category === t.label).length;
          if (t.label !== '全部' && count === 0) return null; // 无武器的分类不展示（如已清空的「未知」）
          return (
            <button
              key={t.label}
              onClick={() => setTab(t.label)}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-1.5 rounded-full border transition-colors ${
                active
                  ? 'bg-accent text-bg border-accent font-semibold shadow-[0_0_16px_rgba(47,227,164,0.35)]'
                  : 'border-edge bg-panel/60 text-muted hover:text-main hover:border-border-hi'
              }`}
            >
              {t.icon('w-3.5 h-3.5')}
              {t.label}
              {/* 对齐设计稿：「全部」不展示计数 */}
              {t.label !== '全部' && <span className="num opacity-80">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* 武器卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {list.map((w) => {
          const hot = HOT_WEAPONS.has(w.name);
          return (
            <Link
              key={w.id}
              href={`/weapons/${w.id}`}
              className="tac-panel tac-hover rounded-lg overflow-hidden group flex flex-col"
            >
              {/* 标题区：武器名 + 类别·口径，热门角标靠右 */}
              <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate group-hover:text-accent transition-colors">
                    {w.name}
                  </h3>
                  <p className="text-[11px] text-muted mt-0.5 truncate">
                    {w.category}
                    <span className="num"> · {w.caliber || '—'}</span>
                  </p>
                </div>
                {hot && (
                  <span className="shrink-0 badge bg-danger/15 text-danger border-danger/40">🔥 热门</span>
                )}
              </div>

              {/* 图片区：扁平宽幅 + 暗底径向渐变，枪械图不压过文字信息 */}
              <div className="relative aspect-[3/1] flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(47,227,164,0.05),transparent_70%)] bg-bg px-5">
                <WeaponImage src={w.image} alt={w.name} />
              </div>

              {/* 参数栏：8 项等宽平铺，标签在上数值在下（对齐参考图） */}
              <div className="num grid grid-cols-8 gap-x-1 px-2.5 py-2 border-t border-edge/60">
                {CARD_STATS.map((s) => (
                  <div key={s.key} className="flex flex-col items-center gap-0.5 min-w-0">
                    <span className="text-[10px] text-muted whitespace-nowrap">{s.label}</span>
                    <b className="text-[13px] font-semibold text-main">{w.panel[s.key] ?? '—'}</b>
                  </div>
                ))}
              </div>

              {/* 底部操作条：hover 变色，替代原参考图的「复制改枪码」 */}
              <div className="mt-auto flex items-center justify-center gap-1 border-t border-edge/60 py-1.5 text-[11px] text-muted group-hover:text-accent group-hover:bg-panel-hi/40 transition-colors">
                查看详情
                <span className="text-[13px] leading-none">›</span>
              </div>
            </Link>
          );
        })}
      </div>
      {!list.length && <p className="text-muted text-sm py-10 text-center">该分类暂无收录</p>}
    </div>
  );
}
