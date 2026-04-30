import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../lib/envelope.js';
import { HttpError } from '../lib/httpError.js';
import {
  QuoteNotFoundError,
  QuoteRateLimitError,
} from '../lib/quote/index.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
import type { TradeService } from '../services/tradeService.js';

const tradeSchema = z.object({
  symbol: z.string().trim().min(1).max(32),
  side: z.enum(['BUY', 'SELL']),
  qty: z.number().int().positive(),
});

export function makeTradeRouter(tradeService: TradeService): Router {
  const router = Router();
  router.use(verifyAuth);

  // POST /api/v1/trade
  router.post('/', async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, '인증이 필요합니다');
      const body = tradeSchema.parse(req.body);
      try {
        const result = await tradeService.execute({
          uid: req.user.uid,
          symbol: body.symbol,
          side: body.side,
          qty: body.qty,
        });
        res.json(ok(result, '체결되었습니다'));
      } catch (err) {
        // 시세 조회 단계 에러를 HTTP 로 매핑 (markets.ts 와 동일 정책)
        if (err instanceof QuoteNotFoundError) {
          throw new HttpError(404, '종목을 찾을 수 없습니다');
        }
        if (err instanceof QuoteRateLimitError) {
          throw new HttpError(429, '잠시 후 다시 시도해주세요');
        }
        throw err;
      }
    } catch (err) {
      next(err);
    }
  });

  return router;
}
