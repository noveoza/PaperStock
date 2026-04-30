/**
 * 시세 공급자 추상화.
 * 향후 Polygon, Alpaca 등으로 교체 가능하도록 인터페이스 분리.
 * 1차 구현체: lib/quote/yahoo.ts (yahoo-finance2)
 */

export type Range = '1d' | '1w' | '1m' | '3m' | '1y' | 'all';

export interface Quote {
  symbol: string;
  name: string;
  last_price: number;
  change: number;
  change_pct: number;
  currency: string;
  market: string;
}

export interface Candle {
  /** Unix epoch seconds — lightweight-charts 호환 */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  market: string;
  currency: string;
}

export interface QuoteProvider {
  quote(symbol: string): Promise<Quote>;
  history(symbol: string, range: Range): Promise<Candle[]>;
  search(q: string): Promise<SearchResult[]>;
}

/**
 * 사용자 입력 심볼을 yahoo-finance2 가 받는 형태로 정규화한다.
 *
 * - 6자리 숫자 (한국 종목코드) + suffix 없음 → `.KS` 우선, `.KQ` fallback 으로 재시도 가능
 * - 이미 suffix 가 붙어 있거나 미국 티커 등 → 그대로 (대문자만)
 *
 * `fallback` 이 정의된 경우 호출자가 NotFound 시 그 심볼로 재시도해야 한다.
 *
 * 예:
 *   '005930'      → { canonical: '005930.KS', fallback: '005930.KQ' }
 *   '005930.KS'   → { canonical: '005930.KS' }
 *   'aapl'        → { canonical: 'AAPL' }
 */
export interface NormalizedSymbol {
  canonical: string;
  fallback?: string;
}

export function normalizeSymbol(input: string): NormalizedSymbol {
  const trimmed = input.trim().toUpperCase();
  if (/^\d{6}$/.test(trimmed)) {
    return { canonical: `${trimmed}.KS`, fallback: `${trimmed}.KQ` };
  }
  return { canonical: trimmed };
}

/** 종목 미존재 — routes/markets.ts 가 404 로 변환 */
export class QuoteNotFoundError extends Error {
  constructor(symbol: string) {
    super(`quote not found: ${symbol}`);
    this.name = 'QuoteNotFoundError';
  }
}

/** 외부 레이트리밋 — routes/markets.ts 가 429 로 변환 */
export class QuoteRateLimitError extends Error {
  constructor() {
    super('quote rate limited');
    this.name = 'QuoteRateLimitError';
  }
}
