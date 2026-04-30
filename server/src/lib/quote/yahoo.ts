import YahooFinance from 'yahoo-finance2';
import { roundPct, roundPrice } from '../money.js';
import {
  QuoteNotFoundError,
  QuoteRateLimitError,
  type Candle,
  type Quote,
  type QuoteProvider,
  type Range,
  type SearchResult,
} from './index.js';

// v3 부터는 클래스 기반 — 인스턴스를 만들고 옵션으로 안내 메시지 끔
const yahooFinance = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
});

type ChartInterval = '5m' | '30m' | '1h' | '1d' | '1wk' | '1mo';

/** range → period1 / interval 매핑. 거래일 보정 포함. */
function rangeToParams(range: Range): { period1: Date; interval: ChartInterval } {
  const now = new Date();
  const period1 = new Date(now);
  switch (range) {
    case '1d':
      period1.setDate(period1.getDate() - 2); // 휴장 보정
      return { period1, interval: '5m' };
    case '1w':
      period1.setDate(period1.getDate() - 7);
      return { period1, interval: '30m' };
    case '1m':
      period1.setMonth(period1.getMonth() - 1);
      return { period1, interval: '1d' };
    case '3m':
      period1.setMonth(period1.getMonth() - 3);
      return { period1, interval: '1d' };
    case '1y':
      period1.setFullYear(period1.getFullYear() - 1);
      return { period1, interval: '1d' };
    case 'all':
      return { period1: new Date('2000-01-01'), interval: '1wk' };
  }
}

function detectMarket(symbol: string, fallback?: string | null): string {
  if (symbol.endsWith('.KS')) return 'KOSPI';
  if (symbol.endsWith('.KQ')) return 'KOSDAQ';
  const ex = (fallback ?? '').toUpperCase();
  if (ex === 'NMS' || ex.includes('NASDAQ')) return 'NASDAQ';
  if (ex === 'NYQ' || ex.includes('NYSE')) return 'NYSE';
  return fallback ?? '';
}

function detectCurrency(symbol: string, fallback?: string | null): string {
  if (symbol.endsWith('.KS') || symbol.endsWith('.KQ')) return 'KRW';
  return fallback ?? 'USD';
}

/**
 * Yahoo 측 에러를 표준 에러로 매핑.
 * Yahoo 가 429 일 때 본문은 plain text "Too Many Requests" 라
 * yahoo-finance2 가 JSON.parse 하다 SyntaxError 를 던지는 케이스도 잡는다.
 */
function mapError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (/rate.?limit|429|too.?many.?requests|unexpected token 't'/i.test(msg)) {
    throw new QuoteRateLimitError();
  }
  if (/not found|no data|404|invalid/i.test(msg)) {
    throw new QuoteNotFoundError(msg);
  }
  throw err;
}

export const yahooProvider: QuoteProvider = {
  async quote(symbol) {
    let raw;
    try {
      raw = await yahooFinance.quote(symbol);
    } catch (err) {
      mapError(err);
    }
    // yahoo-finance2.quote 는 단일 심볼이면 객체, 다중이면 배열
    const q = Array.isArray(raw) ? raw[0] : raw;
    if (!q || q.regularMarketPrice == null) {
      throw new QuoteNotFoundError(symbol);
    }
    const currency = detectCurrency(symbol, q.currency);
    const result: Quote = {
      symbol: q.symbol ?? symbol,
      name: q.longName ?? q.shortName ?? q.displayName ?? symbol,
      last_price: roundPrice(q.regularMarketPrice, currency),
      change: roundPrice(q.regularMarketChange ?? 0, currency),
      change_pct: roundPct(q.regularMarketChangePercent ?? 0),
      currency,
      market: detectMarket(symbol, q.fullExchangeName ?? q.exchange ?? null),
    };
    return result;
  },

  async history(symbol, range) {
    const { period1, interval } = rangeToParams(range);
    let result;
    try {
      result = await yahooFinance.chart(symbol, { period1, interval });
    } catch (err) {
      mapError(err);
    }
    const quotes = result?.quotes ?? [];
    const currency = detectCurrency(symbol, result?.meta?.currency ?? null);
    const candles: Candle[] = [];
    for (const c of quotes) {
      if (
        c == null ||
        c.open == null ||
        c.high == null ||
        c.low == null ||
        c.close == null
      ) {
        continue;
      }
      const date = c.date instanceof Date ? c.date : new Date(c.date);
      candles.push({
        t: Math.floor(date.getTime() / 1000),
        o: roundPrice(c.open, currency),
        h: roundPrice(c.high, currency),
        l: roundPrice(c.low, currency),
        c: roundPrice(c.close, currency),
        v: c.volume ?? 0,
      });
    }
    return candles;
  },

  async search(q) {
    let raw;
    try {
      raw = await yahooFinance.search(q, { quotesCount: 10, newsCount: 0 });
    } catch (err) {
      mapError(err);
    }
    const out: SearchResult[] = [];
    for (const r of raw?.quotes ?? []) {
      const sym = (r as { symbol?: string }).symbol;
      if (!sym) continue;
      const rec = r as Record<string, unknown>;
      const name =
        (rec.longname as string | undefined) ??
        (rec.shortname as string | undefined) ??
        sym;
      const exch =
        (rec.exchDisp as string | undefined) ??
        (rec.exchange as string | undefined) ??
        null;
      out.push({
        symbol: sym,
        name,
        market: detectMarket(sym, exch),
        currency: detectCurrency(sym, null),
      });
    }
    return out;
  },
};
