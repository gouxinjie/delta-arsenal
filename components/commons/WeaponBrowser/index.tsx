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
  IconTarget,
  IconBolt,
  IconRecoil,
} from '@/components/commons/icons';

/** 卡片武器图：无图或加载失败时显示枪械剪影占位（配合数据源图片缺失场景） */
function WeaponImage({ src, alt }: { src: string; alt: string }) {
  const [err, setErr] = useState(!src);
  if (err) {
    return (
      <span className="flex items-center justify-center text-muted/30">
        <IconRifle className="w-20 h-20" />
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="max-h-full object-contain transition-all duration-300 group-hover:scale-110 drop-shadow-[0_6px_16px_rgba(47,227,164,0.16)] group-hover:drop-shadow-[0_8px_26px_rgba(47,227,164,0.4)]"
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
  /** 面板摘要（伤害/射速/后坐） */
  panel: { meatHarm?: number; fireRate?: number; recoil?: number };
}

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((w) => {
          const hot = HOT_WEAPONS.has(w.name);
          return (
            <Link key={w.id} href={`/weapons/${w.id}`} className="tac-panel tac-hover rounded-lg overflow-hidden group">
              {/* 图片区：暗底径向渐变 + 武器图青绿光晕，hover 增强；无图走占位剪影 */}
              <div className="relative aspect-[4/3] flex items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_center,rgba(47,227,164,0.06),transparent_70%)] bg-bg">
                <WeaponImage src={w.image} alt={w.name} />
                {hot && (
                  <span className="absolute top-2 right-2 badge bg-danger/15 text-danger border-danger/40">🔥 热门</span>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold group-hover:text-accent transition-colors truncate">{w.name}</h3>
                <p className="num text-[11px] text-muted mt-0.5">{w.caliber || '—'}</p>
                {/* 面板摘要：伤害(橙) / 射速(蓝) / 后坐(绿)，数字与图标同色（对齐设计稿） */}
                <p className="num text-[11px] mt-2 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-warn">
                    <IconTarget className="w-3.5 h-3.5" />
                    <b className="font-semibold">{w.panel.meatHarm ?? '—'}</b>
                  </span>
                  <span className="flex items-center gap-1 text-info">
                    <IconBolt className="w-3.5 h-3.5" />
                    <b className="font-semibold">{w.panel.fireRate ?? '—'}</b>
                  </span>
                  <span className="flex items-center gap-1 text-accent">
                    <IconRecoil className="w-3.5 h-3.5" />
                    <b className="font-semibold">{w.panel.recoil ?? '—'}</b>
                  </span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      {!list.length && <p className="text-muted text-sm py-10 text-center">该分类暂无收录</p>}
    </div>
  );
}
