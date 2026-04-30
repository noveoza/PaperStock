/**
 * 통화별 가격 반올림.
 * - KRW / JPY: 정수 단위
 * - 그 외: 소수점 둘째자리까지
 */
export function roundPrice(value: number, currency: string): number {
  if (!Number.isFinite(value)) return 0;
  if (currency === 'KRW' || currency === 'JPY') return Math.round(value);
  return Math.round(value * 100) / 100;
}

/** 변동률 등 퍼센트 — 소수점 둘째자리 */
export function roundPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}
