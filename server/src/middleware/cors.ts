import cors from 'cors';
import { env } from '../env.js';

/**
 * CORS 정책.
 *
 * - dev/test (`NODE_ENV !== 'production'`): 임의 `http://localhost:<port>` 허용
 *   (Vite 가 5173 점유 시 5174/5175 등으로 fallback 하는 케이스 흡수)
 * - production: `env.CORS_ORIGIN` 정확히 일치하는 단일 origin 만 허용
 * - origin 헤더가 없는 요청 (curl, 서버-서버) 은 통과
 */
const localhostPattern = /^http:\/\/localhost:\d+$/;

export const corsMiddleware = cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (env.NODE_ENV !== 'production' && localhostPattern.test(origin)) {
      return cb(null, true);
    }
    if (origin === env.CORS_ORIGIN) return cb(null, true);
    cb(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
});
