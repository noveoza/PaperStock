// 사용자 데이터 Firestore 직접 구독 헬퍼.
// 백엔드를 거치지 않고 Firebase JS SDK 의 onSnapshot 으로 실시간 반영.

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';

export interface UserDoc {
  uid: string;
  email: string;
  display_name: string | null;
  seed_cash: number;
  cash: number;
  created_at?: Timestamp;
  updated_at?: Timestamp;
}

export interface Holding {
  symbol: string;
  name: string;
  qty: number;
  avg_price: number;
  market: string;
  currency: string;
  updated_at?: Timestamp;
}

/** users/{uid} 문서 구독. 문서가 없으면 null. */
export function watchUser(uid: string, cb: (user: UserDoc | null) => void): Unsubscribe {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => {
      if (!snap.exists()) {
        cb(null);
        return;
      }
      const data = snap.data() as Omit<UserDoc, 'uid'>;
      cb({ ...data, uid });
    },
    (err) => {
      console.error('[firestore] watchUser error:', err);
      cb(null);
    },
  );
}

/** users/{uid}/holdings 컬렉션 구독. qty > 0 인 행만 노출. */
export function watchHoldings(
  uid: string,
  cb: (holdings: Holding[]) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'users', uid, 'holdings'),
    (snap) => {
      const list: Holding[] = snap.docs
        .map((d) => {
          const data = d.data() as Omit<Holding, 'symbol'>;
          return { ...data, symbol: d.id };
        })
        .filter((h) => h.qty > 0)
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
      cb(list);
    },
    (err) => {
      console.error('[firestore] watchHoldings error:', err);
      cb([]);
    },
  );
}

/* ======================== Watchlist ======================== */

export interface WatchlistItem {
  symbol: string;
  name: string;
  market: string;
  currency?: string;
  added_at?: Timestamp;
}

/** users/{uid}/watchlist 컬렉션 구독. 추가된 시각 기준 내림차순. */
export function watchWatchlist(
  uid: string,
  cb: (items: WatchlistItem[]) => void,
): Unsubscribe {
  return onSnapshot(
    collection(db, 'users', uid, 'watchlist'),
    (snap) => {
      const list: WatchlistItem[] = snap.docs.map((d) => {
        const data = d.data() as Omit<WatchlistItem, 'symbol'>;
        return { ...data, symbol: d.id };
      });
      // added_at 내림차순 정렬 (없으면 뒤로)
      list.sort((a, b) => {
        const at = a.added_at?.toMillis?.() ?? 0;
        const bt = b.added_at?.toMillis?.() ?? 0;
        return bt - at;
      });
      cb(list);
    },
    (err) => {
      console.error('[firestore] watchWatchlist error:', err);
      cb([]);
    },
  );
}

export async function addToWatchlist(
  uid: string,
  item: { symbol: string; name: string; market: string; currency?: string },
): Promise<void> {
  const ref = doc(db, 'users', uid, 'watchlist', item.symbol);
  await setDoc(ref, {
    symbol: item.symbol,
    name: item.name,
    market: item.market,
    ...(item.currency ? { currency: item.currency } : {}),
    added_at: serverTimestamp(),
  });
}

export async function removeFromWatchlist(
  uid: string,
  symbol: string,
): Promise<void> {
  const ref = doc(db, 'users', uid, 'watchlist', symbol);
  await deleteDoc(ref);
}

/* ======================== Trades (체결 내역) ======================== */

export type TradeSideValue = 'BUY' | 'SELL';

export interface TradeDoc {
  id: string;
  symbol: string;
  name: string;
  side: TradeSideValue;
  qty: number;
  price: number;
  amount: number;
  currency: string;
  executed_at: Timestamp | null;
}

/** users/{uid}/trades 구독. executed_at desc 정렬. */
export function watchTrades(
  uid: string,
  cb: (trades: TradeDoc[]) => void,
): Unsubscribe {
  const q = query(
    collection(db, 'users', uid, 'trades'),
    orderBy('executed_at', 'desc'),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: TradeDoc[] = snap.docs.map((d) => {
        const data = d.data() as Omit<TradeDoc, 'id'>;
        return { ...data, id: d.id };
      });
      cb(list);
    },
    (err) => {
      console.error('[firestore] watchTrades error:', err);
      cb([]);
    },
  );
}
