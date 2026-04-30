import { Router } from 'express';
import { ok } from '../lib/envelope.js';
import { HttpError } from '../lib/httpError.js';
import { verifyAuth } from '../middleware/verifyAuth.js';
import { initUser } from '../services/userService.js';

export const usersRouter: Router = Router();

/**
 * POST /api/v1/users/init
 * 회원가입 직후 사용자 문서 초기화. seed_cash 지급. 멱등.
 */
usersRouter.post('/init', verifyAuth, async (req, res, next) => {
  try {
    if (!req.user) throw new HttpError(401, '인증이 필요합니다');
    const result = await initUser(req.user.uid, req.user.email);
    res.json(ok(result));
  } catch (err) {
    next(err);
  }
});
