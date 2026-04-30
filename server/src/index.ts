import 'dotenv/config';
import express from 'express';
import { env } from './env.js';
import { ok } from './lib/envelope.js';
import { logger } from './lib/logger.js';
import { yahooProvider } from './lib/quote/yahoo.js';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLog } from './middleware/requestLog.js';
import { makeMarketsRouter } from './routes/markets.js';
import { makePortfolioRouter } from './routes/portfolio.js';
import { makeTradeRouter } from './routes/trade.js';
import { usersRouter } from './routes/users.js';
import { MarketService } from './services/marketService.js';
import { TradeService } from './services/tradeService.js';

const app = express();

// 글로벌 미들웨어
app.use(corsMiddleware);
app.use(express.json({ limit: '64kb' }));
app.use(requestLog);

// 의존성 결선
const market = new MarketService(yahooProvider);
const trade = new TradeService(market);

// 헬스체크 (인증 불필요)
app.get('/health', (_req, res) => {
  res.json(ok({ status: 'ok' }));
});

// 라우트 (verifyAuth 는 라우트/라우터 단에서 적용)
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/markets', makeMarketsRouter(market));
app.use('/api/v1/trade', makeTradeRouter(trade));
app.use('/api/v1/portfolio', makePortfolioRouter(market));

// 404
app.use((_req, res) => {
  res.status(404).json({
    status_code: 404,
    message: '경로를 찾을 수 없습니다',
    data: null,
  });
});

// 에러 핸들러는 항상 마지막
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, cors: env.CORS_ORIGIN, env: env.NODE_ENV },
    'paperstock-server up',
  );
});
