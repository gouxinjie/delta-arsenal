/**
 * @component SearchDialog
 * @description 全局搜索弹窗（命令面板式）：模糊匹配武器 / 弹药 / 口径 / 武器别名，↑↓ 选择、Enter 直达、Esc 关闭、Ctrl/⌘ + K 唤起；
 *              结果按武器 / 弹药分组（各有展示配额，避免口径检索时单类被另一类挤掉）并高亮命中片段，
 *              别名命中仍展示官方枪名（如「维克托」→ Vector冲锋枪），空态给数据驱动的热门口径快捷入口；
 *              索引从 /search-index.json 懒加载（首次打开时请求），带加载骨架 / 失败重试状态
 * @author gouxinjie
 * @created 2026-11-23
 * @updated 2026-11-27
 */
'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { IconCross, IconSearch } from '@/components/commons/icons';
import { tierColor } from '@/constants/game';
import { useOverlay } from '@/hooks/useOverlay';
import { startRouteProgress } from '@/hooks/useRouteProgress';

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
  /** 别名（仅武器）：玩家口语 / 英文原名，来自 constants/weapon-aliases.json */
  alias?: string[];
}

/** 命中字段：决定高亮哪一列，别名与类别命中时名称本身并不含关键词 */
type HitKind = 'name' | 'alias' | 'caliber' | 'category';

/** 带命中信息的搜索结果（分组、键盘遍历、渲染都以它为单位） */
interface Hit {
  /** 索引条目 */
  item: SearchItem;
  /** 得分，越小越靠前 */
  score: number;
  /** 命中字段 */
  kind: HitKind;
}

/** 索引加载状态 */
type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/** 搜索结果条数上限：超出后用户应细化关键词，页脚会提示真实匹配总数 */
const MAX_RESULTS = 12;

/**
 * 单一类型的展示配额：口径这类「武器和弹药都会命中」的关键词，
 * 只按分数排序会让数量多的一类占满全部名额（实测搜 7.62 时 12 条全是武器、弹药不可见）
 */
const GROUP_QUOTA = 6;

/** 空态展示的热门口径条数 */
const MAX_SUGGESTIONS = 6;


/**
 * 结果条目唯一键（武器与弹药的 id 分属不同命名空间，必须带类型前缀）
 * @param item - 索引条目
 * @returns 形如 weapon:18010000001 的键
 */
function keyOf(item: Pick<SearchItem, 'type' | 'id'>): string {
  return `${item.type}:${item.id}`;
}

/**
 * 结果条目 -> 详情地址（跳转与预取共用，避免两处拼接规则漂移）
 * @param item - 索引条目
 * @returns 武器走详情页，弹药带 id 定位到弹药库
 */
function hrefOf(item: SearchItem): string {
  return item.type === 'weapon' ? `/weapons/${item.id}` : `/ammo?ammo=${item.id}`;
}

/**
 * 弹药穿透色：穿 6 起为专属弹（与弹药库 / 矩阵页判定口径一致），统一取危险色
 * @param pen - 穿透等级
 * @param tier - 品阶 1-5，null 表示专属弹
 * @returns CSS 颜色值
 */
function penTone(pen: number | undefined, tier: number | null | undefined): string {
  return (pen ?? 0) >= 6 ? 'var(--danger)' : tierColor(tier);
}

/**
 * 高亮名称中首个命中的关键词片段
 * @param text - 原始名称
 * @param keyword - 已转小写的关键词
 * @returns 命中片段包在 <mark> 中的节点；无命中时返回原文本
 */
function highlight(text: string, keyword: string): ReactNode {
  if (!keyword) return text;
  const at = text.toLowerCase().indexOf(keyword);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-transparent font-semibold text-accent">{text.slice(at, at + keyword.length)}</mark>
      {text.slice(at + keyword.length)}
    </>
  );
}

/**
 * 解析 /search-index.json，缺字段的脏数据直接丢弃（索引由本地脚本生成，仍需防御）
 * @description caliber 必须校验：搜索匹配时会对它调用 toLowerCase，缺失会让整个弹窗抛错
 * @param raw - fetch 拿到的原始 JSON
 * @returns 扁平化的索引条目数组
 */
function normalizeIndex(raw: unknown): SearchItem[] {
  if (!raw || typeof raw !== 'object') return [];
  const { ammo, weapons } = raw as { ammo?: unknown; weapons?: unknown };

  /**
   * 解析单类条目：必需字段缺失直接丢弃，可选字段逐个校验后透传
   * @param list - 原始数组
   * @param type - 期望的类型（与所在数组一致才收）
   * @returns 规范化后的条目
   */
  const pick = (list: unknown, type: SearchItem['type']): SearchItem[] => {
    if (!Array.isArray(list)) return [];
    return list.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') return [];
      const item = entry as Partial<SearchItem>;
      if (
        item.type !== type ||
        typeof item.id !== 'string' ||
        typeof item.name !== 'string' ||
        typeof item.caliber !== 'string'
      ) {
        return [];
      }
      const alias = Array.isArray(item.alias)
        ? item.alias.filter((text): text is string => typeof text === 'string' && text.trim() !== '')
        : [];
      return [
        {
          type,
          id: item.id,
          name: item.name,
          caliber: item.caliber,
          ...(typeof item.pen === 'number' ? { pen: item.pen } : {}),
          ...(typeof item.tier === 'number' || item.tier === null ? { tier: item.tier } : {}),
          ...(typeof item.category === 'string' ? { category: item.category } : {}),
          ...(alias.length ? { alias } : {}),
        },
      ];
    });
  };
  return [...pick(weapons, 'weapon'), ...pick(ammo, 'ammo')];
}

/**
 * 按类型配额截取结果：先给每类最多 GROUP_QUOTA 条，名额没用满再按分数补齐
 * @description 两层遍历都按分数升序遍历，因此同一分组内的相对顺序仍是「分数优先」
 * @param scored - 已按得分升序排好的命中项
 * @returns 不超过 MAX_RESULTS 条的展示列表
 */
function limitByGroup(scored: Hit[]): Hit[] {
  const picked: Hit[] = [];
  const used = new Map<SearchItem['type'], number>();
  for (const hit of scored) {
    if (picked.length >= MAX_RESULTS) return picked;
    const count = used.get(hit.item.type) ?? 0;
    if (count >= GROUP_QUOTA) continue;
    used.set(hit.item.type, count + 1);
    picked.push(hit);
  }
  if (picked.length >= MAX_RESULTS) return picked;
  // 某一类命中不足配额时把剩余名额还给另一类，单类检索不会被压到 6 条
  const taken = new Set(picked.map((hit) => keyOf(hit.item)));
  for (const hit of scored) {
    if (picked.length >= MAX_RESULTS) break;
    if (taken.has(keyOf(hit.item))) continue;
    picked.push(hit);
  }
  return picked;
}

export default function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState<SearchItem[]>([]);
  const [status, setStatus] = useState<LoadStatus>('idle');
  /** 键盘选中的结果下标（与渲染顺序一致：先武器后弹药） */
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  /** 选项节点引用：键盘移动后把选中行滚进可视区 */
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  /** 结果滚动容器：换关键词时把滚动位置拉回顶部，避免停留在上一轮结果的中段 */
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const router = useRouter();
  const pathname = usePathname();
  /** 已预取过的地址，避免鼠标划过多条结果时重复请求 */
  const prefetchedRef = useRef<Set<string>>(new Set());

  /** 关闭并重置关键词与选中项（引用稳定，供 useOverlay 依赖） */
  const close = useCallback(() => {
    setOpen(false);
    setQ('');
    setActive(0);
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
   * 懒加载搜索索引（在「打开弹窗」事件里调用，失败后点重试按钮可再次发起）
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
        const list = normalizeIndex(data);
        // 空索引只有「sync 没跑」或「字段改了」两种可能：按失败处理，否则界面会显示「已索引 0 把武器」，
        // 用户只会以为站内没数据，连重试入口都没有
        if (!list.length) throw new Error('搜索索引为空或字段格式不符');
        setItems(list);
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
      // 中文输入法组合期间按键不算快捷键，否则会打断正在拼写的输入
      if (event.isComposing) return;
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

  /** 小写关键词，供匹配、高亮与空态判断共用 */
  const keyword = q.trim().toLowerCase();

  /**
   * 匹配结果：名称前缀 > 名称包含 > 别名包含 > 口径包含 > 类别包含；
   * total 保留真实命中数，用于页脚提示「还有更多，需细化关键词」
   */
  const matched = useMemo(() => {
    if (!keyword) return { list: [] as Hit[], total: 0 };
    const scored: Hit[] = [];
    for (const item of items) {
      const name = item.name.toLowerCase();
      if (name.startsWith(keyword)) {
        scored.push({ item, score: 0, kind: 'name' });
        continue;
      }
      if (name.includes(keyword)) {
        scored.push({ item, score: 1, kind: 'name' });
        continue;
      }
      if (item.alias?.some((alias) => alias.toLowerCase().includes(keyword))) {
        scored.push({ item, score: 2, kind: 'alias' });
        continue;
      }
      if (item.caliber.toLowerCase().includes(keyword)) {
        scored.push({ item, score: 3, kind: 'caliber' });
        continue;
      }
      if ((item.category ?? '').toLowerCase().includes(keyword)) {
        scored.push({ item, score: 4, kind: 'category' });
      }
    }
    scored.sort((a, b) => a.score - b.score);
    return { list: limitByGroup(scored), total: scored.length };
  }, [keyword, items]);

  /** 展示用的分组：顺序即键盘遍历顺序（武器在前、弹药在后） */
  const groups = useMemo(
    () =>
      [
        { type: 'weapon' as const, label: '武器', list: matched.list.filter((hit) => hit.item.type === 'weapon') },
        { type: 'ammo' as const, label: '弹药', list: matched.list.filter((hit) => hit.item.type === 'ammo') },
      ].filter((group) => group.list.length > 0),
    [matched.list]
  );

  /** 分组铺平后的线性列表，键盘选择与 aria-activedescendant 都基于它 */
  const flat = useMemo(() => groups.flatMap((group) => group.list), [groups]);

  /** 条目键 -> 线性下标，渲染时避免 O(n²) 查找 */
  const indexOf = useMemo(() => new Map(flat.map((hit, index) => [keyOf(hit.item), index])), [flat]);

  /** 结果集变化（如索引刚加载完）时下标可能越界，读取时统一夹紧 */
  const activeIndex = flat.length ? Math.min(active, flat.length - 1) : -1;
  const activeHit = activeIndex >= 0 ? flat[activeIndex] : undefined;

  // 键盘移动后把选中行滚进可视区（block: nearest 已可见时不滚动）
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  // 关键词变化即回顶：结果集整体替换后，保留旧滚动位置会让人误以为列表没更新
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [keyword]);

  /** 索引规模：空态提示「已索引多少内容」，比重复 placeholder 文案更有信息量 */
  const stats = useMemo(
    () => ({
      weapon: items.filter((item) => item.type === 'weapon').length,
      ammo: items.filter((item) => item.type === 'ammo').length,
    }),
    [items]
  );

  /** 空态热门口径：按弹药条数取前几名，避免硬编码游戏数据 */
  const suggestions = useMemo(() => {
    const count = new Map<string, number>();
    items.forEach((item) => {
      if (item.type !== 'ammo') return;
      count.set(item.caliber, (count.get(item.caliber) ?? 0) + 1);
    });
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_SUGGESTIONS)
      .map(([caliber]) => caliber);
  }, [items]);

  /**
   * 上下移动选中项（循环：首项再按 ↑ 跳到末项）
   * @param delta - 1 向下，-1 向上
   */
  const move = (delta: 1 | -1): void => {
    if (!flat.length) return;
    setActive((current) => {
      const from = Math.min(current, flat.length - 1);
      return (from + delta + flat.length) % flat.length;
    });
  };

  /**
   * 预取结果对应的路由：生产环境命中缓存后可秒开；开发环境 Next 不启用预取，调用无副作用
   * @param item - 鼠标悬浮或键盘选中的结果
   */
  const prefetch = useCallback(
    (item: SearchItem): void => {
      const href = hrefOf(item);
      if (prefetchedRef.current.has(href)) return;
      prefetchedRef.current.add(href);
      router.prefetch(href);
    },
    [router]
  );

  // 键盘选中项变化时同步预取：Enter 落下之前目标路由已经就绪
  useEffect(() => {
    if (!open || !activeHit) return;
    prefetch(activeHit.item);
  }, [open, activeHit, prefetch]);

  /**
   * 跳转到目标详情：弹药带 id 精确命中（按名称模糊检索会在 M855 / M855A1 这类同前缀弹种上选错）
   * @param item - 选中的搜索结果
   */
  const go = (item: SearchItem): void => {
    const href = hrefOf(item);
    close();
    // 路径变化才算整页跳转：弹窗关闭到新页面出现之间的空窗由顶部进度条兜住
    if (href.split('?')[0] !== pathname) startRouteProgress();
    router.push(href);
  };

  /** 输入框键盘：↑↓ 选择、Enter 打开（输入法候选阶段不拦截，避免误触发跳转） */
  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (activeHit) go(activeHit.item);
    }
  };

  /** 清空关键词并把焦点交还输入框 */
  const clearQuery = (): void => {
    setQ('');
    setActive(0);
    inputRef.current?.focus();
  };

  /** 点击热门口径：填入关键词并聚焦输入框，用户可直接继续细化 */
  const applySuggestion = (caliber: string): void => {
    setQ(caliber);
    setActive(0);
    inputRef.current?.focus();
  };

  /** 页脚结果计数：区分「无匹配 / 全部展示 / 仅展示前 N 条」 */
  const countText = !keyword
    ? ''
    : matched.total === 0
      ? '无匹配结果'
      : matched.total > matched.list.length
        ? `匹配 ${matched.total} 项 · 显示前 ${matched.list.length}`
        : `${matched.total} 项结果`;

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
            className="tac-panel tac-panel-plain w-full max-w-xl overflow-hidden rounded-xl p-2 anim-slide outline-none [box-shadow:var(--modal-shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 输入区：聚焦时放大镜与底边一起转强调色，明确「输入中」 */}
            <div className="group flex items-center gap-2 border-b border-edge px-2 transition-colors focus-within:border-accent">
              <IconSearch className="w-4 h-4 shrink-0 text-muted transition-colors group-focus-within:text-accent" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKeyDown}
                role="combobox"
                aria-label="搜索关键词"
                aria-autocomplete="list"
                aria-expanded={groups.length > 0}
                aria-controls={groups.length > 0 ? listId : undefined}
                aria-activedescendant={activeHit ? `${listId}-opt-${activeIndex}` : undefined}
                placeholder="输入枪名、别名、弹名或口径，如：M4 / 维克托 / M995"
                className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted"
              />
              {q && (
                <button
                  type="button"
                  onClick={clearQuery}
                  aria-label="清空关键词"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-panel-hi hover:text-main"
                >
                  <IconCross className="h-3.5 w-3.5" />
                </button>
              )}
              <kbd className="key-chip hidden shrink-0 sm:inline">Esc</kbd>
            </div>

            {/* 结果区：窄屏限制高度，避免软键盘弹出后撑出屏幕；分组标题吸顶便于长列表定位。
                结构为 listbox > group > option，分组标题用 presentation，避免被读屏算成可选项 */}
            {groups.length > 0 && (
              <div
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label="搜索结果"
                className="max-h-[50dvh] overflow-y-auto py-1 sm:max-h-80"
              >
                {groups.map((group) => (
                  <div key={group.type} role="group" aria-label={group.label}>
                    <div
                      role="presentation"
                      className="sticky top-0 z-10 flex items-baseline justify-between border-b border-edge bg-panel-hi px-3 py-1.5"
                    >
                      <span className="text-[10px] tracking-[0.18em] text-muted">{group.label}</span>
                      <span className="num text-[10px] text-muted">{group.list.length}</span>
                    </div>
                    {group.list.map((hit) => {
                      const { item } = hit;
                      const index = indexOf.get(keyOf(item));
                      // 键不在线性表里说明渲染数据与 flat 不同步：宁可少画一条，也不要用错误的兜底下标高亮别的行
                      if (index === undefined) return null;
                      const selected = index === activeIndex;
                      /** 弹药穿透徽章配色；武器没有徽章，不参与取色 */
                      const tone = item.type === 'ammo' ? penTone(item.pen, item.tier) : '';
                      return (
                        <div
                          key={keyOf(item)}
                          id={`${listId}-opt-${index}`}
                          role="option"
                          aria-selected={selected}
                          ref={(node) => {
                            optionRefs.current[index] = node;
                          }}
                          onMouseEnter={() => {
                            setActive(index);
                            prefetch(item);
                          }}
                          onClick={() => go(item)}
                          className={`relative mx-1 flex cursor-pointer select-none items-center gap-2.5 rounded px-2.5 py-2 transition-colors ${
                            selected ? 'bg-[color:var(--accent-dim)]' : 'hover:bg-panel-hi'
                          }`}
                          title={`${item.name} · ${item.caliber}`}
                          aria-label={`${item.type === 'weapon' ? '武器' : '弹药'} ${item.name}`}
                        >
                          {/* 选中态左侧强调条：键盘移动时比底色更容易被余光捕捉 */}
                          <span
                            aria-hidden="true"
                            className={`absolute inset-y-1 left-0 w-[2px] rounded ${
                              selected ? 'bg-accent' : 'bg-transparent'
                            }`}
                          />
                          {/* 名称列：只有名称命中才高亮；别名命中时名称本身不含关键词，避免出现「无高亮却被选中」的错觉 */}
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {hit.kind === 'name' ? highlight(item.name, keyword) : item.name}
                          </span>
                          {item.type === 'ammo' && item.pen !== undefined && (
                            <span
                              className="num shrink-0 rounded-[3px] px-1.5 py-0.5 text-[10px]"
                              style={{
                                color: tone,
                                backgroundColor: `color-mix(in srgb, ${tone} 14%, transparent)`,
                              }}
                            >
                              穿 {item.pen}
                            </span>
                          )}
                          {/* 口径列：按口径命中时在这里高亮，否则用户看不出为什么命中 */}
                          <span className="num max-w-[6.5rem] shrink-0 truncate text-right text-xs text-muted">
                            {hit.kind === 'caliber' ? highlight(item.caliber, keyword) : item.caliber}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* 加载 / 失败 / 空态：不放进 listbox，空态含可聚焦按钮，塞进 listbox 会破坏 ARIA 结构 */}
            {groups.length === 0 && (
              <div className="py-1">
                {status === 'loading' && (
                  <div className="px-3 py-2" role="status" aria-label="搜索索引加载中">
                    <div className="sk h-4 w-3/5" />
                    <div className="sk mt-3 h-4 w-4/5" />
                    <div className="sk mt-3 h-4 w-2/5" />
                  </div>
                )}

                {status === 'error' && (
                  <div className="px-3 py-6 text-center">
                    <p className="text-sm text-danger">搜索索引不可用，请检查网络后重试</p>
                    <button
                      type="button"
                      onClick={loadIndex}
                      className="mt-3 rounded border border-edge px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                    >
                      重新加载
                    </button>
                  </div>
                )}

                {status === 'ready' && !keyword && (
                  <div className="px-3 py-4">
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted">
                      <IconSearch className="mr-0.5 h-4 w-4 shrink-0" />
                      已索引
                      <span className="num text-main">{stats.weapon}</span>
                      把武器 ·
                      <span className="num text-main">{stats.ammo}</span>
                      种弹药
                    </p>
                    {suggestions.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-[10px] tracking-[0.18em] text-muted">热门口径</p>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.map((caliber) => (
                            <button
                              key={caliber}
                              type="button"
                              onClick={() => applySuggestion(caliber)}
                              className="num rounded border border-edge bg-bg px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                            >
                              {caliber}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {status === 'ready' && keyword && matched.total === 0 && (
                  <div className="px-3 py-6 text-center text-sm text-muted">
                    没有找到「{q.trim()}」，试试更短的关键词或直接搜口径
                  </div>
                )}
              </div>
            )}

            {/* 页脚：左侧结果计数（读屏播报），右侧键位提示（触屏隐藏）；
                触屏且无计数时整条隐藏，避免空态/空结果下多出一条无信息量的分隔带 */}
            <div
              className={`items-center gap-2 border-t border-edge px-2 py-2 text-[11px] text-muted ${
                countText ? 'flex' : 'hidden sm:flex'
              }`}
            >
              <span className="num" aria-live="polite">
                {countText}
              </span>
              <span className="ml-auto hidden items-center gap-3 sm:flex">
                <span className="flex items-center gap-1">
                  <kbd className="key-chip">↑</kbd>
                  <kbd className="key-chip">↓</kbd>
                  <span className="ml-0.5">选择</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="key-chip">Enter</kbd>
                  <span className="ml-0.5">打开</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="key-chip">Esc</kbd>
                  <span className="ml-0.5">关闭</span>
                </span>
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
