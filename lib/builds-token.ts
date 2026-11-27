/**
 * 改枪码入库口令的本机存储（localStorage + useSyncExternalStore）
 * @description 口令只是为了省去重复输入，真正的权限校验发生在服务端（环境变量 BUILDS_WRITE_TOKEN）。
 *              用外部存储订阅而不是在 effect 里读写：
 *              1. 服务端渲染 / 水合阶段只能拿到固定空串，不会产生 HTML 不一致；
 *              2. 避免「在 effect 内同步 setState」引发的级联渲染（ESLint react-hooks 规则）。
 * @author gouxinjie
 * @created 2026-11-27
 * @updated 2026-11-27
 */

/** localStorage 键名 */
const TOKEN_KEY = 'delta-builds-token';

/** 当前快照（useSyncExternalStore 要求返回稳定值，不能每次新建对象） */
let snapshot = '';

/** 是否已经从 localStorage 读过（首次读取后不再重复解析） */
let loaded = false;

/** 订阅者集合 */
const listeners = new Set<() => void>();

/** 通知所有订阅者 */
function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * 订阅口令变化
 * @param listener - 变化回调
 * @returns 取消订阅函数
 * @description 同时支持多标签页同步：其它页面改了口令时本页跟着更新
 */
export function subscribeToken(listener: () => void): () => void {
  listeners.add(listener);

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== TOKEN_KEY) return;
    // 让下一次 getSnapshot 重新读盘，再通知订阅者取新值
    loaded = false;
    listener();
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

/**
 * 读取当前口令快照
 * @returns 本机记住的口令；没有则返回空串
 */
export function getTokenSnapshot(): string {
  if (!loaded) {
    loaded = true;
    try {
      snapshot = window.localStorage.getItem(TOKEN_KEY) ?? '';
    } catch (error) {
      // 隐私模式下读不到：按空串处理，用户仍可在当前页面输入
      console.warn('[builds-token] 口令读取失败', error);
      snapshot = '';
    }
  }
  return snapshot;
}

/**
 * 服务端渲染快照（水合阶段只能返回固定值）
 * @returns 空串
 */
export function getTokenServerSnapshot(): string {
  return '';
}

/**
 * 写入口令
 * @param value - 最新口令（空串表示清除记忆）
 * @description 写入失败（隐私模式 / 配额不足）时仍更新内存快照，保证当前页面可用
 */
export function writeToken(value: string): void {
  snapshot = value;
  loaded = true;
  try {
    window.localStorage.setItem(TOKEN_KEY, value);
  } catch (error) {
    console.warn('[builds-token] 口令记忆失败', error);
  }
  notify();
}
