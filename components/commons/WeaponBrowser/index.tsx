/**
 * @component WeaponBrowser
 * @description 武器图鉴浏览器：按类型 Tab 筛选，卡片网格展示，图片懒加载并处理加载失败占位
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-23
 */
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

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

const TABS = ['全部', '步枪', '冲锋枪', '精确射手步枪', '狙击步枪', '轻机枪', '霰弹枪', '手枪', '未知'];

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
      <div className="flex gap-1.5 flex-wrap mb-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`text-sm px-3 py-1.5 rounded border transition-colors ${
              tab === t ? 'border-accent text-accent' : 'border-edge text-muted hover:text-main'
            }`}
          >
            {t}
            {t !== '全部' && (
              <span className="num text-[10px] ml-1">{weapons.filter((w) => w.category === t).length}</span>
            )}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {list.map((w) => (
          <Link key={w.id} href={`/weapons/${w.id}`} className="tac-panel tac-hover p-3 group overflow-hidden">
            <div className="aspect-[4/3] bg-bg rounded flex items-center justify-center overflow-hidden mb-2">
              <img
                src={w.image}
                alt={w.name}
                loading="lazy"
                className="max-h-full object-contain transition-transform duration-300 group-hover:scale-110"
                onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
              />
            </div>
            <h3 className="text-sm font-medium group-hover:text-accent transition-colors truncate">{w.name}</h3>
            <p className="num text-[11px] text-muted mt-0.5">{w.caliber || '—'}</p>
            <p className="num text-[11px] text-muted mt-1.5 flex gap-2">
              <span>
                伤 <b className="text-accent">{w.panel.meatHarm ?? '—'}</b>
              </span>
              <span>
                速 <b className="text-info">{w.panel.fireRate ?? '—'}</b>
              </span>
              <span>
                后 <b className="text-main">{w.panel.recoil ?? '—'}</b>
              </span>
            </p>
          </Link>
        ))}
      </div>
      {!list.length && <p className="text-muted text-sm py-10 text-center">该分类暂无收录</p>}
    </div>
  );
}
