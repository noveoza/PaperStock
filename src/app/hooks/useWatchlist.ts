import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../lib/auth';
import {
  addToWatchlist,
  removeFromWatchlist,
  watchWatchlist,
  type WatchlistItem,
} from '../lib/firestore';

export interface UseWatchlistResult {
  items: WatchlistItem[];
  loading: boolean;
  /** 해당 심볼이 관심 종목에 있는지 */
  has: (symbol: string) => boolean;
  /** 추가 (멱등 — 동일 symbol 이면 added_at 만 갱신) */
  add: (item: {
    symbol: string;
    name: string;
    market: string;
    currency?: string;
  }) => Promise<void>;
  /** 해제 */
  remove: (symbol: string) => Promise<void>;
  /** 토글 */
  toggle: (item: {
    symbol: string;
    name: string;
    market: string;
    currency?: string;
  }) => Promise<void>;
}

export function useWatchlist(): UseWatchlistResult {
  const { user, status } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = watchWatchlist(user.uid, (list) => {
      setItems(list);
      setLoading(false);
    });
    return unsub;
  }, [user, status]);

  const symbolSet = useMemo(
    () => new Set(items.map((i) => i.symbol)),
    [items],
  );

  const has = useCallback((symbol: string) => symbolSet.has(symbol), [symbolSet]);

  const add = useCallback<UseWatchlistResult['add']>(
    async (item) => {
      if (!user) throw new Error('인증이 필요합니다.');
      await addToWatchlist(user.uid, item);
    },
    [user],
  );

  const remove = useCallback<UseWatchlistResult['remove']>(
    async (symbol) => {
      if (!user) throw new Error('인증이 필요합니다.');
      await removeFromWatchlist(user.uid, symbol);
    },
    [user],
  );

  const toggle = useCallback<UseWatchlistResult['toggle']>(
    async (item) => {
      if (!user) throw new Error('인증이 필요합니다.');
      if (symbolSet.has(item.symbol)) {
        await removeFromWatchlist(user.uid, item.symbol);
      } else {
        await addToWatchlist(user.uid, item);
      }
    },
    [user, symbolSet],
  );

  return { items, loading, has, add, remove, toggle };
}
