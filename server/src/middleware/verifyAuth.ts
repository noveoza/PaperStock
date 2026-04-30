import type { NextFunction, Request, Response } from 'express';
import admin from '../firebase-admin.js';
import { fail } from '../lib/envelope.js';

/**
 * Firebase ID 토큰 검증.
 * 헤더 형식: Authorization: Bearer <idToken>
 * 성공 시 req.user = { uid, email } 주입.
 *
 * docs/auth-flow.md 「백엔드 토큰 검증」 참조.
 */
export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json(fail(401, '인증이 필요합니다'));
  }
  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json(fail(401, '인증이 필요합니다'));
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = { uid: decoded.uid, email: decoded.email ?? null };
    next();
  } catch {
    res.status(401).json(fail(401, '세션이 만료되었습니다'));
  }
}
