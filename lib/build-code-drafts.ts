/**
 * 改枪码本地草稿存储（localStorage + useSyncExternalStore）
 * @description 静态站没有后端，录入页的草稿只能落在本机浏览器。用外部存储订阅的方式读写：
 *              组件通过 useSyncExternalStore 订阅，避免在 effect 里 setState 造成级联渲染，
 *              同时支持多标签页（storage 事件）同步。
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */

import type { BuildCodeRecord } from '@/types/build-code';

/** localStorage 键名 */
const DRAFT_KEY = 'delta-build-code-drafts';

/** 服务端渲染 / 水合前使用的稳定空快照（必须是同一个引用，否则会无限重渲染） */
const EMPTY_DRAFTS: BuildCodeRecord[] = [];

/** 缓存的快照：getSnapshot 必须返回稳定引用，不能每次读 localStorage 都新建数组 */
let snapshot: BuildCodeRecord[] | null = null;

/** 订阅者集合 */
const listeners = new Set<() => void>();

/**
 * 从 localStorage 解析草稿
 * @returns 合法草稿数组；解析失败按空数组处理
 */
function readStorage(): BuildCodeRecord[] {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY_DRAFTS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_DRAFTS;
    return parsed.filter((item): item is BuildCodeRecord => {
      if (!item || typeof item !== 'object') return false;
      const record = item as Partial<BuildCodeRecord>;
      return (
        typeof record.id === 'string' &&
        typeof record.weapon === 'string' &&
        typeof record.code === 'string'
      );
    });
  } catch (error) {
    console.warn('[build-code-drafts] 草稿读取失败，按空列表处理', error);
    return EMPTY_DRAFTS;
  }
}

/**
 * 订阅草稿变化
 * @param listener - 变化回调
 * @returns 取消订阅函数
 */
export function subscribeDrafts(listener: () => void): () => void {
  listeners.add(listener);

  // 跨标签页：其它页面写入草稿时，本页失效缓存并通知订阅者
  const handleStorage = (event: StorageEvent) => {
    if (event.key !== DRAFT_KEY) return;
    snapshot = null;
    listener();
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * 读取当前草稿快照
 * @returns 稳定引用的草稿数组
 */
export function getDraftsSnapshot(): BuildCodeRecord[] {
  if (snapshot === null) snapshot = readStorage();
  return snapshot;
}

/**
 * 服务端渲染快照（水合阶段只能返回固定值，避免 HTML 不一致）
 * @returns 空数组
 */
export function getDraftsServerSnapshot(): BuildCodeRecord[] {
  return EMPTY_DRAFTS;
}

/**
 * 覆盖写入草稿
 * @param drafts - 最新草稿列表
 * @description 写入失败（隐私模式 / 配额不足）时仍更新内存快照，保证当前页面可用
 */
export function writeDrafts(drafts: BuildCodeRecord[]): void {
  snapshot = drafts;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch (error) {
    console.warn('[build-code-drafts] 草稿写入失败（可能是隐私模式或存储已满）', error);
  }
  for (const listener of listeners) listener();
}
