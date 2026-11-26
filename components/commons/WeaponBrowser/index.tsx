/**
 * @component WeaponBrowser
 * @description 武器图鉴浏览器：按类型 Tab（带图标 + 计数）筛选，卡片网格展示，点击卡片从右侧弹出详情抽屉（不跳页）
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-26
 */
'use client';

import { useCallback, useMemo, useState } from 'react';
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
import SmartImage from '@/components/commons/SmartImage';
import WeaponDrawer from '@/components/commons/WeaponDrawer';
import { WEAPON_CARD_STAT_KEYS, WEAPON_STAT_META } from '@/constants/weapon';
import { computeStatMax } from '@/lib/view';
import type { WeaponDetail } from '@/types/weapon';

/** 图片偏小的分类：短枪身高宽比接近方形，在宽幅图区里会被撑满高度显得过大，单独缩放 */
const COMPACT_IMG_CATEGORIES = new Set(['手枪']);

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
  /** 武器列表（含抽屉所需的弹药与槽位数据） */
  weapons: WeaponDetail[];
}

export default function WeaponBrowser({ weapons }: WeaponBrowserProps) {
  const [tab, setTab] = useState('全部');
  /** 当前抽屉中展示的武器，null 表示抽屉关闭 */
  const [selected, setSelected] = useState<WeaponDetail | null>(null);
  const closeDrawer = useCallback(() => setSelected(null), []);

  const list = useMemo(
    () => (tab === '全部' ? weapons : weapons.filter((w) => w.category === tab)),
    [weapons, tab]
  );

  /** 抽屉进度条用到的字段在全库中的最大值（刻度算法与武器详情页共用 lib/view） */
  const statMax = useMemo(() => computeStatMax(weapons.map((w) => w.panel)), [weapons]);

  /**
   * 卡片点击：阻止默认跳转并打开左侧抽屉；带修饰键（Ctrl/Cmd/Shift）或中键点击时保留浏览器原生新标签页行为
   * @param e - 卡片点击事件
   * @param w - 被点击的武器
   */
  const openDrawer = (e: React.MouseEvent<HTMLAnchorElement>, w: WeaponDetail) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setSelected(w);
  };

  return (
    <div>
      {/* 分类 Tab：胶囊按钮，选中青绿填充（窄屏缩小内边距与字号，尽量少占高度） */}
      <div className="flex gap-1.5 flex-wrap mb-4 sm:mb-5">
        {TABS.map((t) => {
          const active = tab === t.label;
          const count = t.label === '全部' ? weapons.length : weapons.filter((w) => w.category === t.label).length;
          if (t.label !== '全部' && count === 0) return null; // 无武器的分类不展示（如已清空的「未知」）
          return (
            <button
              key={t.label}
              onClick={() => setTab(t.label)}
              className={`flex items-center gap-1.5 whitespace-nowrap text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 rounded-full border transition-colors ${
                active
                  ? 'bg-accent text-[color:var(--on-accent)] border-accent font-semibold [box-shadow:var(--tab-glow)]'
                  : 'border-edge bg-panel/60 text-muted hover:bg-accent hover:text-[color:var(--on-accent)] hover:border-accent hover:font-semibold hover:[box-shadow:var(--tab-glow)]'
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-4 lg:grid-cols-3">
        {list.map((w) => {
          const hot = HOT_WEAPONS.has(w.name);
          return (
            <Link
              key={w.id}
              href={`/weapons/${w.id}`}
              onClick={(e) => openDrawer(e, w)}
              aria-haspopup="dialog"
              aria-label={`查看 ${w.name} 详情`}
              className="tac-panel tac-panel-plain tac-hover-border rounded-lg overflow-hidden flex flex-col"
            >
              {/* 标题区：武器名 + 类别·口径，热门角标靠右 */}
              <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pb-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold truncate">{w.name}</h3>
                  <p className="text-[11px] text-muted mt-0.5 truncate">
                    {w.category}
                    {/* 使用的弹药口径：强调色胶囊，与类别文字区分开 */}
                    <span className="num ml-1 px-1 py-px rounded text-accent font-medium bg-accent/10">
                      {w.caliber || '—'}
                    </span>
                  </p>
                </div>
                {hot && (
                  <span className="shrink-0 badge bg-danger/15 text-danger border-danger/40">🔥 热门</span>
                )}
              </div>

              {/* 图片区：扁平宽幅 + 暗底径向渐变，枪械图不压过文字信息 */}
              <div className="thumb-bg relative aspect-[7/2] flex items-center justify-center overflow-hidden bg-bg px-5">
                <SmartImage
                  src={w.image}
                  alt={w.name}
                  className={`weapon-img max-w-full object-contain opacity-90 ${
                    COMPACT_IMG_CATEGORIES.has(w.category) ? 'max-h-[68%]' : 'max-h-full'
                  }`}
                  fallback={
                    <span className="flex items-center justify-center text-muted/30">
                      <IconRifle className="w-12 h-12" />
                    </span>
                  }
                />
              </div>

              {/* 参数栏：桌面 8 项一行，窄屏拆成 4 列 × 2 行，避免数字挤成一团 */}
              <div className="num grid grid-cols-4 gap-x-1 gap-y-2 px-2.5 py-2 border-t border-edge/60 sm:grid-cols-8 sm:gap-y-0">
                {WEAPON_CARD_STAT_KEYS.map((key) => (
                  <div key={key} className="flex flex-col items-center gap-0.5 min-w-0">
                    <span className="text-[10px] text-muted whitespace-nowrap">{WEAPON_STAT_META[key].short}</span>
                    <b className="text-[13px] font-semibold text-main">{w.panel[key] ?? '—'}</b>
                  </div>
                ))}
              </div>

              {/* 底部操作条：常态强调色 + 淡强调底，hover 不再变化 */}
              <div className="mt-auto flex items-center justify-center gap-1 border-t border-edge/60 py-2 text-[13px] font-medium text-accent bg-accent/10">
                查看详情
                <span className="text-[14px] leading-none">›</span>
              </div>
            </Link>
          );
        })}
      </div>
      {!list.length && <p className="text-muted text-sm py-10 text-center">该分类暂无收录</p>}

      {/* 详情抽屉：左侧滑出，展示弹药 / 属性 / 槽位 */}
      <WeaponDrawer weapon={selected} statMax={statMax} onClose={closeDrawer} />
    </div>
  );
}
