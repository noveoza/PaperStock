import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../lib/envelope.js';
import { HttpError } from '../lib/httpError.js';
import {
  QuoteNotFoundError,
  QuoteRateLimitError,
} from '../lib/quote/index.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
import type { MarketService } from '../services/marketService.js';

const quoteSchema = z.object({
  symbol: z.string().trim().min(1).max(32),
});

const historySchema = z.object({
  symbol: z.string().trim().min(1).max(32),
  range: z.enum(['1d', '1w', '1m', '3m', '1y', 'all']),
});

const searchSchema = z.object({
  q: z.string().trim().min(1).max(64),
});

/** Quote provider 도메인 에러 → HTTP 에러 매핑 */
function translateQuoteError(err: unknown): never {
  if (err instanceof QuoteNotFoundError) {
    throw new HttpError(404, '종목을 찾을 수 없습니다');
  }
  if (err instanceof QuoteRateLimitError) {
    throw new HttpError(429, '잠시 후 다시 시도해주세요');
  }
  throw err;
}

export function makeMarketsRouter(market: MarketService): Router {
  const router = Router();

  // 모든 markets 엔드포인트는 인증 필요
  router.use(verifyAuth);

  // GET /api/v1/markets/quote?symbol=
  router.get('/quote', async (req, res, next) => {
    try {
      const { symbol } = quoteSchema.parse(req.query);
      try {
        const data = await market.getQuote(symbol);
        res.json(ok(data));
      } catch (err) {
        translateQuoteError(err);
      }
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/markets/history?symbol=&range=
  router.get('/history', async (req, res, next) => {
    try {
      const { symbol, range } = historySchema.parse(req.query);
      try {
        // marketService 가 한국 종목 정규화 후 실제 사용된 symbol 을 반환
        const result = await market.getHistory(symbol, range);
        res.json(ok({ symbol: result.symbol, range, candles: result.candles }));
      } catch (err) {
        translateQuoteError(err);
      }
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/markets/search?q=
  router.get('/search', async (req, res, next) => {
    try {
      const { q } = searchSchema.parse(req.query);
      try {
        const results = await market.search(q);
        res.json(ok({ results }));
      } catch (err) {
        translateQuoteError(err);
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
}
