/**
 * 响应式断点 Hook（基于 useSyncExternalStore 订阅 matchMedia）
 * @description 与常见 `useEffect + setState` 实现相比无首帧闪烁：
 *              服务端渲染与水合首帧统一返回 null，由调用方按「未知」处理，
 *              水合完成后立即切到真实匹配结果，不会出现一次多余的布局重建。
 *              典型用途：桌面 / 移动两套 DOM 结构二选一，避免两套全部渲染。
 * @author gouxinjie
 * @created 2026-11-26
 */

import { useCallback, useSyncExternalStore } from 'react';

/**
 * 订阅媒体查询变化
 * @param query - 媒体查询字符串，如 `(min-width: 768px)`
 * @returns 是否命中；服务端与水合首帧返回 null（未知）
 */
export function useMediaQuery(query: string): boolean | null {
  /** 订阅回调：matchMedia 变更时通知 React 重新取快照 */
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    [query]
  );

  /** 客户端快照：返回布尔原始值，引用天然稳定，不会触发无限重渲染 */
  const getSnapshot = useCallback((): boolean => window.matchMedia(query).matches, [query]);

  /** 服务端快照：无法得知视口，返回 null 交由调用方兜底 */
  const getServerSnapshot = useCallback((): null => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
