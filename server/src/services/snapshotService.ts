import { FieldValue, db } from '../firebase-admin.js';
import { logger } from '../lib/logger.js';
import type { MarketService } from './marketService.js';

const USD_KRW_FALLBACK = 1300;

/** 스냅샷 range — markets/history 와 통일 */
export type SnapshotRange = '1d' | '1w' | '1m' | '3m' | '1y' | 'all';

export interface Snapshot {
  date: string; // KST 기준 YYYY-MM-DD (= 문서 ID)
  total_krw: number; // cash_krw + Σ(qty × price × fx)
  cash_krw: number; // 현금 잔고 (KRW)
  holdings_value_krw: number; // Σ(qty × price × fx)
}

interface HoldingDoc {
  symbol?: string;
  qty?: number;
  avg_price?: number;
  currency?: string;
}

/** 오늘의 KST 날짜 (YYYY-MM-DD). KST = UTC+9. */
export function todayKstStr(): string {
  return kstDateStr(new Date());
}

function kstDateStr(when: Date): string {
  const kst = new Date(when.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** range → 시작 날짜 문자열 (KST). 'all' 은 0000-01-01 로 사실상 전 구간. */
function rangeToStartDate(range: SnapshotRange): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  switch (range) {
    case '1d':
      return kstDateStr(now);
    case '1w':
      kst.setUTCDate(kst.getUTCDate() - 6);
      break;
    case '1m':
      kst.setUTCMonth(kst.getUTCMonth() - 1);
      break;
    case '3m':
      kst.setUTCMonth(kst.getUTCMonth() - 3);
      break;
    case '1y':
      kst.setUTCFullYear(kst.getUTCFullYear() - 1);
      break;
    case 'all':
      return '0000-01-01';
  }
  // kst 는 위에서 9h shift 된 상태 — 그대로 UTC 게터로 YYYY-MM-DD 추출
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(kst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 통화 → KRW 환율. tradeService 의 동일 정책. */
async function getKrwRate(market: MarketService, currency: string): Promise<number> {
  if (currency === 'KRW') return 1;
  const fxSymbol = currency === 'USD' ? 'KRW=X' : `${currency}KRW=X`;
  try {
    const fx = await market.getQuote(fxSymbol);
    if (Number.isFinite(fx.last_price) && fx.last_price > 0) return fx.last_price;
  } catch {
    /* fall through */
  }
  return USD_KRW_FALLBACK;
}

/**
 * 사용자의 현재 자산을 계산해 today 스냅샷 (KST) 을 upsert.
 *
 * - cash + Σ(holdings.qty × current_price × fx_rate) → total_krw
 * - 시세 조회 실패 종목은 holdings.avg_price 로 폴백 (보수적 평가)
 * - 같은 날짜 재호출 시 merge 갱신 (체결 직후 fire-and-forget 호출 가능)
 *
 * 호출 패턴:
 *   1. 거래 체결 직후 — tradeService 가 fire-and-forget 으로
 *   2. /portfolio/snapshots GET 시 — 오늘자 누락이면 lazy compute
 */
export async function computeAndUpsertSnapshot(
  uid: string,
  market: MarketService,
): Promise<Snapshot> {
  const date = todayKstStr();
  const userRef = db.collection('users').doc(uid);

  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    throw new Error(`user not found: ${uid}`);
  }
  const cashKrw = ((userSnap.data() ?? {}).cash as number | undefined) ?? 0;

  const holdingsSnap = await userRef.collection('holdings').get();

  // 환율 캐시 — 같은 통화 여러 종목이어도 yahoo 한 번만 조회
  const fxByCurrency = new Map<string, number>();
  fxByCurrency.set('KRW', 1);

  let holdingsValueKrw = 0;
  for (const doc of holdingsSnap.docs) {
    const h = (doc.data() ?? {}) as HoldingDoc;
    const symbol = h.symbol ?? doc.id;
    const qty = h.qty ?? 0;
    const currency = h.currency ?? 'KRW';
    if (qty <= 0) continue;

    let priceNative: number;
    try {
      const quote = await market.getQuote(symbol);
      priceNative = quote.last_price;
    } catch (err) {
      logger.warn(
        { uid, symbol, err: err instanceof Error ? err.message : err },
        'snapshot: quote fetch failed; falling back to avg_price',
      );
      priceNative = h.avg_price ?? 0;
    }

    let fx = fxByCurrency.get(currency);
    if (fx === undefined) {
      fx = await getKrwRate(market, currency);
      fxByCurrency.set(currency, fx);
    }

    holdingsValueKrw += priceNative * qty * fx;
  }
  holdingsValueKrw = Math.round(holdingsValueKrw);
  const totalKrw = cashKrw + holdingsValueKrw;

  await userRef.collection('snapshots').doc(date).set(
    {
      date,
      total_krw: totalKrw,
      cash_krw: cashKrw,
      holdings_value_krw: holdingsValueKrw,
      taken_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return { date, total_krw: totalKrw, cash_krw: cashKrw, holdings_value_krw: holdingsValueKrw };
}

/**
 * 시계열 조회. 오늘자 스냅샷이 없으면 즉시 compute 후 합쳐서 반환.
 * 정렬: 날짜 오름차순.
 */
export async function getSnapshotSeries(
  uid: string,
  range: SnapshotRange,
  market: MarketService,
): Promise<Snapshot[]> {
  const today = todayKstStr();
  const start = rangeToStartDate(range);

  const colRef = db.collection('users').doc(uid).collection('snapshots');
  const querySnap = await colRef
    .where('date', '>=', start)
    .where('date', '<=', today)
    .orderBy('date')
    .get();

  const series: Snapshot[] = querySnap.docs.map((d) => {
    const data = d.data();
    return {
      date: data.date,
      total_krw: data.total_krw,
      cash_krw: data.cash_krw,
      holdings_value_krw: data.holdings_value_krw,
    };
  });

  // lazy: 오늘자 누락이면 즉시 계산
  const hasToday = series.some((s) => s.date === today);
  if (!hasToday) {
    try {
      const todaySnap = await computeAndUpsertSnapshot(uid, market);
      series.push(todaySnap);
    } catch (err) {
      logger.warn(
        { uid, err: err instanceof Error ? err.message : err },
        'snapshot: lazy compute failed',
      );
    }
  }

  return series;
}
