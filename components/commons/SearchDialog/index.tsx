/**
 * @component SearchDialog
 * @description 全局搜索弹窗：模糊匹配武器/弹药/口径，键盘 Enter 直达、Esc 关闭；索引从 /search-index.json 加载
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-25
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { IconSearch } from '@/components/commons/icons';

/** 搜索索引条目（由 sync 脚本生成） */
interface SearchItem {
  /** 类型：弹药或武器 */
  type: 'ammo' | 'weapon';
  /** 唯一标识 */
  id: string;
  /** 名称 */
  name: string;
  /** 口径 */
  caliber: string;
  /** 穿透等级（仅弹药） */
  pen?: number;
  /** 品阶（仅弹药） */
  tier?: number | null;
  /** 类别（仅武器） */
  category?: string;
}

/** 品阶文字颜色映射 */
const TIER_COLOR = ['text-t1', 'text-t2', 'text-t3', 'text-t4', 'text-t5'];

export default function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/search-index.json')
      .then((r) => r.json())
      .then((d) => setItems([...d.weapons, ...d.ammo]))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const s = q.trim().toLowerCase();
    return items
      .filter(
        (i) =>
          i.name.toLowerCase().includes(s) ||
          i.caliber.toLowerCase().includes(s) ||
          (i.category ?? '').includes(s)
      )
      .slice(0, 12);
  }, [q, items]);

  const go = (item: SearchItem) => {
    setOpen(false);
    setQ('');
    router.push(item.type === 'weapon' ? `/weapons/${item.id}` : `/ammo?q=${encodeURIComponent(item.name)}`);
  };

  return (
    <>
      {/* 搜索入口：图标 + 提示文案 + 快捷键键帽 */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-muted border border-edge rounded-md px-3 py-1.5 bg-bg/60 hover:border-accent/60 hover:text-main transition-colors"
      >
        <IconSearch className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">搜索武器 / 弹药…</span>
        <kbd className="key-chip hidden sm:inline">Ctrl + K</kbd>
      </button>

      {/* 弹窗通过 Portal 挂到 body：Header 的 backdrop-blur 会成为 fixed 后代的包含块，
          直接渲染会把遮罩裁进头部那一条（浅色主题下尤其明显）。
          open 只由点击事件置为 true，SSR 阶段不会访问 document，额外加保护更稳妥 */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 bg-[color:var(--overlay)] anim-fade flex items-start justify-center pt-24 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="tac-panel w-full max-w-lg p-3 anim-slide [box-shadow:var(--modal-shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 bg-bg border border-edge rounded px-3 focus-within:border-accent">
              <IconSearch className="w-4 h-4 text-muted shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="输入枪名、弹名或口径，如：M4 / M995 / 5.56"
                className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results[0]) go(results[0]);
                  if (e.key === 'Escape') setOpen(false);
                }}
              />
            </div>
            <ul className="mt-2 max-h-80 overflow-y-auto">
              {results.map((r) => (
                <li key={r.type + r.id}>
                  <button
                    onClick={() => go(r)}
                    className="w-full text-left px-3 py-2 hover:bg-bg rounded flex items-center gap-3 text-sm"
                  >
                    <span
                      className={`text-[10px] px-1.5 py-0.5 border border-edge rounded ${
                        r.type === 'weapon' ? 'text-info' : TIER_COLOR[(r.tier ?? 1) - 1]
                      }`}
                    >
                      {r.type === 'weapon' ? '武器' : '弹药'}
                    </span>
                    <span>{r.name}</span>
                    <span className="num text-xs text-muted ml-auto">{r.caliber}</span>
                  </button>
                </li>
              ))}
              {q && !results.length && <li className="px-3 py-4 text-sm text-muted">没有找到「{q}」</li>}
            </ul>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
