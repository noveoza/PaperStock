import { FieldValue, db } from '../firebase-admin.js';
import { logger } from '../lib/logger.js';
import {
  QuoteNotFoundError,
  normalizeSymbol,
  type Candle,
  type Quote,
  type QuoteProvider,
  type Range,
  type SearchResult,
} from '../lib/quote/index.js';

const CACHE_TTL_MS = 60_000;

export interface CachedQuote extends Quote {
  /** ISO 8601 — 마지막 외부 호출 시각 */
  fetched_at: string;
}

export interface HistoryResult {
  symbol: string; // 정규화 후 실제 사용된 심볼
  candles: Candle[];
}

/**
 * 시세 서비스. market_cache/{symbol} 60초 TTL 캐시 + 외부 공급자 fallback +
 * 한국 종목 심볼 정규화 (`005930` → `.KS` 시도, NotFound 시 `.KQ`).
 *
 * 캐시는 정규화 후 심볼 (`005930.KS` 또는 `005930.KQ`) 을 키로 저장.
 * 사용자가 어떤 형태로 보내도 같은 캐시 슬롯에 hit.
 *
 * docs/db-schema.md 「market_cache/{symbol}」 / docs/api-spec.md
 * 「GET /api/v1/markets/quote」 와 1:1 정렬.
 */
export class MarketService {
  constructor(private readonly provider: QuoteProvider) {}

  async getQuote(input: string): Promise<CachedQuote> {
    const { canonical, fallback } = normalizeSymbol(input);

    // 1) canonical 캐시 hit 확인
    const cachedCanonical = await this.readCache(canonical);
    if (cachedCanonical && this.isFresh(cachedCanonical)) {
      return cachedCanonical;
    }

    // 2) fallback 캐시 hit 확인 (한국 종목 KS/KQ 미상 케이스)
    let cachedFallback: CachedQuote | null = null;
    if (fallback) {
      cachedFallback = await this.readCache(fallback);
      if (cachedFallback && this.isFresh(cachedFallback)) {
        return cachedFallback;
      }
    }

    // 3) provider 호출 — canonical 우선, NotFound 시 fallback 재시도
    try {
      return await this.fetchAndCache(canonical);
    } catch (err) {
      if (err instanceof QuoteNotFoundError && fallback) {
        try {
          return await this.fetchAndCache(fallback);
        } catch (err2) {
          return this.staleOrThrow(input, cachedCanonical, cachedFallback, err2);
        }
      }
      return this.staleOrThrow(input, cachedCanonical, cachedFallback, err);
    }
  }

  async getHistory(input: string, range: Range): Promise<HistoryResult> {
    const { canonical, fallback } = normalizeSymbol(input);
    try {
      const candles = await this.provider.history(canonical, range);
      return { symbol: canonical, candles };
    } catch (err) {
      if (err instanceof QuoteNotFoundError && fallback) {
        const candles = await this.provider.history(fallback, range);
        return { symbol: fallback, candles };
      }
      throw err;
    }
  }

  async search(q: string): Promise<SearchResult[]> {
    // 검색 쿼리는 자유 텍스트 — 정규화 불필요
    return this.provider.search(q);
  }

  // ─── 내부 헬퍼 ──────────────────────────────────────────────

  private isFresh(c: CachedQuote): boolean {
    return Date.now() - new Date(c.fetched_at).getTime() < CACHE_TTL_MS;
  }

  private async readCache(symbol: string): Promise<CachedQuote | null> {
    const snap = await db.collection('market_cache').doc(symbol).get();
    return snap.exists ? this.readCacheDoc(snap.data()) : null;
  }

  private async fetchAndCache(symbol: string): Promise<CachedQuote> {
    const fresh = await this.provider.quote(symbol);
    const fetchedAt = new Date();
    await db.collection('market_cache').doc(symbol).set(
      {
        ...fresh,
        fetched_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    return { ...fresh, fetched_at: fetchedAt.toISOString() };
  }

  /**
   * provider 실패 시 stale cache 라도 fallback. 둘 다 없으면 원본 에러 재던짐.
   * (가용성 우선 — 시세 시연 중 일시 외부 장애 흡수)
   */
  private staleOrThrow(
    input: string,
    cachedCanonical: CachedQuote | null,
    cachedFallback: CachedQuote | null,
    err: unknown,
  ): CachedQuote {
    const stale = cachedCanonical ?? cachedFallback;
    if (stale) {
      logger.warn(
        { input, err: err instanceof Error ? err.message : err },
        'quote fetch failed; serving stale cache',
      );
      return stale;
    }
    throw err;
  }

  /** Firestore 캐시 문서 → CachedQuote 변환 */
  private readCacheDoc(
    data: FirebaseFirestore.DocumentData | undefined,
  ): CachedQuote | null {
    if (!data) return null;
    const fetchedAt: unknown = data.fetched_at;
    let iso: string;
    if (
      fetchedAt &&
      typeof (fetchedAt as { toDate?: () => Date }).toDate === 'function'
    ) {
      iso = (fetchedAt as { toDate: () => Date }).toDate().toISOString();
    } else if (fetchedAt instanceof Date) {
      iso = fetchedAt.toISOString();
    } else {
      iso = new Date(0).toISOString();
    }
    return {
      symbol: data.symbol,
      name: data.name,
      last_price: data.last_price,
      change: data.change ?? 0,
      change_pct: data.change_pct ?? 0,
      currency: data.currency,
      market: data.market,
      fetched_at: iso,
    };
  }
}
