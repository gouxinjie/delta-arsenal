/**
 * @component WeaponBrowser
 * @description 武器图鉴浏览器：按类型 Tab（带图标 + 计数）筛选 + 名称关键词搜索（不区分大小写），卡片网格展示，
 *              强势属性（肉伤 ≥ 35 / 甲伤 ≥ 35 / 射速 ≥ 700，任一项达标只高亮该项数值、标签不变），
 *              点击卡片从右侧弹出详情抽屉（不跳页）
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-27
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
  IconSpecial,
  IconSearch,
  IconUnknown,
} from '@/components/commons/icons';
import SmartImage from '@/components/commons/SmartImage';
import WeaponDrawer from '@/components/commons/WeaponDrawer';
import {
  WEAPON_CARD_STAT_KEYS,
  WEAPON_CATEGORY_ORDER,
  WEAPON_GRADE_NOTE,
  WEAPON_STAT_META,
  weaponGradeLabel,
  weaponGradeTextClass,
} from '@/constants/weapon';
import { computeStatMax, isHighlightedStat, sortByWeaponGrade } from '@/lib/view';
import type { WeaponDetail } from '@/types/weapon';

/** 图片偏小的分类：短枪身高宽比接近方形，在宽幅图区里会被撑满高度显得过大，单独缩放 */
const COMPACT_IMG_CATEGORIES = new Set(['手枪']);

/** 类别 -> Tab 图标（类别顺序由 WEAPON_CATEGORY_ORDER 统一维护，此处只负责配图标） */
const CATEGORY_ICONS: Record<string, (cls: string) => React.ReactNode> = {
  步枪: (c) => <IconRifle className={c} />,
  冲锋枪: (c) => <IconSmg className={c} />,
  精确射手步枪: (c) => <IconDmr className={c} />,
  狙击步枪: (c) => <IconSniper className={c} />,
  轻机枪: (c) => <IconLmg className={c} />,
  霰弹枪: (c) => <IconShotgun className={c} />,
  手枪: (c) => <IconPistol className={c} />,
  特殊武器: (c) => <IconSpecial className={c} />,
};

/**
 * 分类 Tab 配置：全部 + 各类别 + 未知兜底
 * @description 顺序取自 WEAPON_CATEGORY_ORDER，与「全部」列表的排序同源；
 *              此前手写 Tab 漏了「特殊武器」，导致战术复合弓在任何分类下都筛不到
 */
const TABS: { label: string; icon: (cls: string) => React.ReactNode }[] = [
  { label: '全部', icon: (c) => <IconGrid className={c} /> },
  ...WEAPON_CATEGORY_ORDER.map((label) => ({
    label,
    icon: CATEGORY_ICONS[label] ?? ((c: string) => <IconUnknown className={c} />),
  })),
  { label: '未知', icon: (c) => <IconUnknown className={c} /> },
];

/** WeaponBrowser 组件入参 */
interface WeaponBrowserProps {
  /** 武器列表（含抽屉所需的弹药与槽位数据，hot 由 sync 按实战榜写入） */
  weapons: WeaponDetail[];
  /** 热门判定依据说明（如「S12 实战榜 · 护甲5弹药5 · 任一距离档 T0」），用作角标 title；缺省不展示提示 */
  hotNote?: string;
}

export default function WeaponBrowser({ weapons, hotNote }: WeaponBrowserProps) {
  const [tab, setTab] = useState('全部');
  /** 武器名称搜索关键词（受控输入，前后空格在过滤时忽略） */
  const [keyword, setKeyword] = useState('');
  /** 当前抽屉中展示的武器，null 表示抽屉关闭 */
  const [selected, setSelected] = useState<WeaponDetail | null>(null);
  const closeDrawer = useCallback(() => setSelected(null), []);

  /** 归一化后的关键词：小写化实现英文名称不区分大小写 */
  const normalizedKeyword = keyword.trim().toLowerCase();

  /**
   * 待展示列表：先按分类 Tab 过滤，再按名称关键词包含匹配（两者同时生效），
   * 最后按社区分级 1-4 升序排列（未定级沉底，同档内保持类别 / 名称次序）
   */
  const list = useMemo(() => {
    const filtered = weapons.filter((w) => {
      if (tab !== '全部' && w.category !== tab) return false;
      if (!normalizedKeyword) return true;
      return w.name.toLowerCase().includes(normalizedKeyword);
    });
    return sortByWeaponGrade(filtered);
  }, [weapons, tab, normalizedKeyword]);

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
      {/* 名称搜索：放大镜图标 + 受控输入；英文名称比较前统一小写，实现不区分大小写 */}
      <div className="relative mb-3 sm:mb-4">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
          <IconSearch className="w-4 h-4" />
        </span>
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="搜索武器名称，如 M4A1 / AK"
          aria-label="按武器名称搜索"
          className="w-full rounded-lg border border-edge bg-panel/60 py-2 pl-9 pr-16 text-sm text-main outline-none transition-colors placeholder:text-muted/60 focus:border-accent focus:bg-panel"
        />
        {keyword && (
          <button
            type="button"
            onClick={() => setKeyword('')}
            aria-label="清除搜索关键词"
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:text-accent"
          >
            清除
          </button>
        )}
      </div>

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
              className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-[11px] sm:text-xs px-2.5 sm:px-3.5 py-1.5 rounded-full border transition-colors ${
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

      {/* 命中提示：仅有关键词且命中结果非空时展示，避免与下方空状态重复 */}
      {normalizedKeyword && list.length > 0 && (
        <p className="mb-2 text-[11px] text-muted">
          命中 <b className="num text-accent">{list.length}</b> 把武器
        </p>
      )}

      {/* 武器卡片网格 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-4 lg:grid-cols-3">
        {list.map((w) => {
          /** 热门标记来自赛季实战榜（sync 写入），不再是前端写死名单 */
          const hot = w.hot;
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
                  {/* 用 flex-wrap 而不是 truncate：口径 + 等级两个胶囊在窄卡片上宁可换行，也不要把等级裁掉 */}
                  <p className="text-[11px] text-muted mt-0.5 flex flex-wrap items-center gap-1">
                    <span>{w.category}</span>
                    {/* 使用的弹药口径：强调色胶囊，与类别文字区分开 */}
                    <span className="num px-1 py-px rounded text-accent font-medium bg-accent/10">
                      {w.caliber || '—'}
                    </span>
                    {/* 社区分级徽标：1-4 级，未定级（grade=0）不渲染，避免出现「0 级枪」 */}
                    {w.grade > 0 && (
                      <span
                        className={`num px-1 py-px rounded font-medium bg-accent/10 ${weaponGradeTextClass(w.grade)}`}
                        title={WEAPON_GRADE_NOTE}
                      >
                        {weaponGradeLabel(w.grade)}
                      </span>
                    )}
                  </p>
                </div>
                {hot && (
                  <span
                    className="shrink-0 badge bg-danger/15 text-danger border-danger/40"
                    title={hotNote || undefined}
                  >
                    🔥 热门
                  </span>
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
                {WEAPON_CARD_STAT_KEYS.map((key) => {
                  /** 逐项判定：该字段自身达标即用强调色 + 柔光高亮数值，标签保持常态、与其它字段无关 */
                  const hotStat = isHighlightedStat(w.panel, key);
                  return (
                    <div key={key} className="flex flex-col items-center gap-0.5 min-w-0">
                      <span className="text-[10px] text-muted whitespace-nowrap">{WEAPON_STAT_META[key].short}</span>
                      <b
                        className={`text-[13px] font-semibold ${
                          hotStat ? 'text-accent [text-shadow:var(--bar-glow)]' : 'text-main'
                        }`}
                      >
                        {w.panel[key] ?? '—'}
                      </b>
                    </div>
                  );
                })}
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
      {/* 空状态：有关键词时提示搜索无结果（区分「分类无收录」） */}
      {!list.length && (
        <p className="text-muted text-sm py-10 text-center">
          {normalizedKeyword ? `没有找到名称包含「${keyword.trim()}」的武器` : '该分类暂无收录'}
        </p>
      )}

      {/* 详情抽屉：左侧滑出，展示弹药 / 属性 / 槽位 */}
      <WeaponDrawer weapon={selected} statMax={statMax} onClose={closeDrawer} />
    </div>
  );
}
