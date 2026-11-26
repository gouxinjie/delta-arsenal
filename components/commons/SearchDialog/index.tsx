/**
 * @component SearchDialog
 * @description 全局搜索弹窗：模糊匹配武器/弹药/口径，键盘 Enter 直达、Esc 关闭、Ctrl/⌘ + K 唤起；
 *              索引从 /search-index.json 懒加载（首次打开时请求），带加载 / 失败状态
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-26
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { IconSearch } from '@/components/commons/icons';
import { tierTextClass } from '@/constants/game';
import { useOverlay } from '@/hooks/useOverlay';

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

/** 索引加载状态 */
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** 搜索结果条数上限：超出后用户应细化关键词 */
const MAX_RESULTS = 12;

/**
 * 解析 /search-index.json，缺字段的脏数据直接丢弃（索引由本地脚本生成，仍需防御）
 * @description caliber 必须校验：搜索匹配时会对它调用 toLowerCase，缺失会让整个弹窗抛错
 * @param raw - fetch 拿到的原始 JSON
 * @returns 扁平化的索引条目数组
 */
function normalizeIndex(raw: unknown): SearchItem[] {
  if (!raw || typeof raw !== 'object') return [];
  const { ammo, weapons } = raw as { ammo?: unknown; weapons?: unknown };
  const pick = (list: unknown, type: SearchItem['type']): SearchItem[] =>
    Array.isArray(list)
      ? list.filter(
          (item): item is SearchItem =>
            !!item &&
            typeof item === 'object' &&
            (item as SearchItem).type === type &&
            typeof (item as SearchItem).id === 'string' &&
            typeof (item as SearchItem).name === 'string' &&
            typeof (item as SearchItem).caliber === 'string'
        )
      : [];
  return [...pick(weapons, 'weapon'), ...pick(ammo, 'ammo')];
}

export default function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  /** 关闭并清空关键词（引用稳定，供 useOverlay 依赖） */
  const close = useCallback(() => {
    setOpen(false);
    setQ('');
  }, []);

  const dialogRef = useOverlay<HTMLDivElement>(open, close);

  /** 索引加载状态用 ref 同步读取，避免把「是否已发起请求」的判断塞进 effect 造成级联渲染 */
  const statusRef = useRef<LoadStatus>('idle');
  /** 组件是否仍挂载：请求回来时避免对已卸载组件 setState */
  const aliveRef = useRef(true);
  useEffect(() => () => {
    aliveRef.current = false;
  }, []);

  /**
   * 懒加载搜索索引（在「打开弹窗」事件里调用，失败后再次打开可重试）
   * @returns 无
   */
  const loadIndex = useCallback((): void => {
    if (statusRef.current === 'loading' || statusRef.current === 'ready') return;
    statusRef.current = 'loading';
    setStatus('loading');
    fetch('/search-index.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<unknown>;
      })
      .then((data) => {
        if (!aliveRef.current) return;
        setItems(normalizeIndex(data));
        statusRef.current = 'ready';
        setStatus('ready');
      })
      .catch((err: unknown) => {
        console.error('[SearchDialog] 搜索索引加载失败', err);
        if (!aliveRef.current) return;
        statusRef.current = 'error';
        setStatus('error');
      });
  }, []);

  /** 打开弹窗并按需加载索引 */
  const openDialog = useCallback((): void => {
    setOpen(true);
    loadIndex();
  }, [loadIndex]);

  // 全局快捷键：Ctrl + K / ⌘ + K 唤起或关闭（与按钮上的键帽提示保持一致）
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      if (open) close();
      else openDialog();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, close, openDialog]);

  // 打开后聚焦输入框（等弹层挂载完成）
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  const results = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return [];
    /** 命中优先级：名称前缀 > 名称包含 > 口径/类别包含 */
    const scored = items
      .map((item) => {
        const name = item.name.toLowerCase();
        if (name.startsWith(keyword)) return { item, score: 0 };
        if (name.includes(keyword)) return { item, score: 1 };
        if (item.caliber.toLowerCase().includes(keyword)) return { item, score: 2 };
        if ((item.category ?? '').toLowerCase().includes(keyword)) return { item, score: 3 };
        return null;
      })
      .filter((hit): hit is { item: SearchItem; score: number } => hit !== null);
    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, MAX_RESULTS).map((hit) => hit.item);
  }, [q, items]);

  /**
   * 跳转到目标详情：弹药带 id 精确命中（按名称模糊检索会在 M855 / M855A1 这类同前缀弹种上选错）
   * @param item - 选中的搜索结果
   */
  const go = (item: SearchItem): void => {
    close();
    router.push(item.type === 'weapon' ? `/weapons/${item.id}` : `/ammo?ammo=${item.id}`);
  };

  return (
    <>
      {/* 搜索入口：图标 + 提示文案 + 快捷键键帽（窄屏只留图标，避免挤压 LOGO 与主题按钮） */}
      <button
        type="button"
        onClick={openDialog}
        aria-label="搜索武器或弹药（快捷键 Ctrl + K）"
        aria-keyshortcuts="Control+K Meta+K"
        className="flex h-8 items-center gap-2 text-xs text-muted border border-edge rounded-md px-2 sm:px-3 bg-bg/60 hover:border-accent/60 hover:text-main transition-colors"
      >
        <IconSearch className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">搜索武器 / 弹药…</span>
        <kbd className="key-chip hidden md:inline">Ctrl + K</kbd>
      </button>

      {/* 弹窗通过 Portal 挂到 body：Header 的 backdrop-blur 会成为 fixed 后代的包含块，
          直接渲染会把遮罩裁进头部那一条（浅色主题下尤其明显）。
          open 只由点击事件置为 true，SSR 阶段不会访问 document */}
      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-50 bg-[color:var(--overlay)] anim-fade flex items-start justify-center px-3 pt-[12vh] sm:px-4 sm:pt-24"
          onClick={close}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="搜索武器或弹药"
            tabIndex={-1}
            className="tac-panel w-full max-w-lg p-3 anim-slide outline-none [box-shadow:var(--modal-shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 bg-bg border border-edge rounded px-3 focus-within:border-accent">
              <IconSearch className="w-4 h-4 text-muted shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="输入枪名、弹名或口径，如：M4 / M995 / 5.56"
                aria-label="搜索关键词"
                className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && results[0]) go(results[0]);
                }}
              />
            </div>
            {/* 窄屏限制结果区高度，避免软键盘弹出后可视线范围被撑出屏幕 */}
            <ul className="mt-2 max-h-[50dvh] overflow-y-auto sm:max-h-80">
              {results.map((r) => (
                <li key={r.type + r.id}>
                  <button
                    type="button"
                    onClick={() => go(r)}
                    className="w-full text-left px-3 py-2.5 sm:py-2 hover:bg-bg rounded flex items-center gap-3 text-sm"
                  >
                    <span
                      className={`text-[10px] px-1.5 py-0.5 border border-edge rounded ${
                        r.type === 'weapon' ? 'text-info' : tierTextClass(r.tier)
                      }`}
                    >
                      {r.type === 'weapon' ? '武器' : '弹药'}
                    </span>
                    <span className="min-w-0 truncate">{r.name}</span>
                    <span className="num text-xs text-muted ml-auto shrink-0">{r.caliber}</span>
                  </button>
                </li>
              ))}
              {status === 'loading' && <li className="px-3 py-4 text-sm text-muted">搜索索引加载中…</li>}
              {status === 'error' && (
                <li className="px-3 py-4 text-sm text-danger">
                  搜索索引加载失败，请检查网络后重新打开（详见控制台日志）
                </li>
              )}
              {status === 'ready' && !q.trim() && (
                <li className="px-3 py-4 text-sm text-muted">输入枪名、弹名或口径开始搜索，Enter 直达第一条结果</li>
              )}
              {status === 'ready' && q.trim() && !results.length && (
                <li className="px-3 py-4 text-sm text-muted">没有找到「{q.trim()}」</li>
              )}
            </ul>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
