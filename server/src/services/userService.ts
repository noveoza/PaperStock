import { FieldValue, db } from '../firebase-admin.js';

const SEED_CASH = 10_000_000;

export interface InitUserResult {
  uid: string;
  email: string | null;
  seed_cash: number;
  cash: number;
}

/**
 * users/{uid} 문서를 멱등하게 초기화한다.
 * - 이미 존재 → 기존 데이터로 응답 (seed_cash, cash, email 우선)
 * - 미존재 → seed_cash=10,000,000 KRW 로 신규 생성
 *
 * 응답 형식은 docs/api-spec.md 「POST /api/v1/users/init」 와 동일.
 */
export async function initUser(uid: string, email: string | null): Promise<InitUserResult> {
  const ref = db.collection('users').doc(uid);
  const snap = await ref.get();
  if (snap.exists) {
    const data = snap.data() ?? {};
    return {
      uid,
      email: (data.email as string | null | undefined) ?? email,
      seed_cash: (data.seed_cash as number | undefined) ?? SEED_CASH,
      cash: (data.cash as number | undefined) ?? SEED_CASH,
    };
  }
  await ref.set({
    email,
    display_name: null,
    seed_cash: SEED_CASH,
    cash: SEED_CASH,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });
  return { uid, email, seed_cash: SEED_CASH, cash: SEED_CASH };
}
