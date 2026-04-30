import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { fail } from '../lib/envelope.js';
import { HttpError } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';

/**
 * 전역 에러 핸들러. 라우트의 next(err) 또는 throw 가 도달.
 * - ZodError → 400
 * - HttpError → 명시 status
 * - 그 외 → 500 + 로그
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    return res.status(400).json(fail(400, '요청 형식이 올바르지 않습니다'));
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json(fail(err.status, err.message));
  }
  logger.error({ err }, 'unhandled error');
  res.status(500).json(fail(500, '일시적인 오류가 발생했습니다'));
}
