import type { NextFunction, Request, Response } from 'express';
import { logger } from '../lib/logger.js';

/**
 * 요청 단위 액세스 로그. pino 만 사용 (pino-http 의존 없음).
 * 응답 finish 시 method/url/status/duration 을 한 줄로 기록.
 */
export function requestLog(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
    };
    if (res.statusCode >= 500) logger.error(meta);
    else if (res.statusCode >= 400) logger.warn(meta);
    else logger.info(meta);
  });
  next();
}
