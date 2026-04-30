import { Router } from 'express';
import { z } from 'zod';
import { ok } from '../lib/envelope.js';
import { HttpError } from '../lib/httpError.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
import type { MarketService } from '../services/marketService.js';
import { getSnapshotSeries } from '../services/snapshotService.js';

const snapshotsSchema = z.object({
  range: z.enum(['1d', '1w', '1m', '3m', '1y', 'all']).default('1m'),
});

export function makePortfolioRouter(market: MarketService): Router {
  const router = Router();
  router.use(verifyAuth);

  // GET /api/v1/portfolio/snapshots?range=
  router.get('/snapshots', async (req, res, next) => {
    try {
      if (!req.user) throw new HttpError(401, '인증이 필요합니다');
      const { range } = snapshotsSchema.parse(req.query);
      const series = await getSnapshotSeries(req.user.uid, range, market);
      // 응답은 차트용으로 축소 — { date, total_krw } 만 노출
      const points = series.map((s) => ({ date: s.date, total_krw: s.total_krw }));
      res.json(ok({ range, points }));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
