/**
 * API 응답 envelope `{ status_code, message, data }` 헬퍼.
 * 모든 응답은 이 헬퍼로만 만든다 — JSON 직접 조립 금지.
 */

export interface Envelope<T> {
  status_code: number;
  message: string;
  data: T | null;
}

export function ok<T>(data: T, message = 'OK'): Envelope<T> {
  return { status_code: 200, message, data };
}

export function fail(status: number, message: string): Envelope<null> {
  return { status_code: status, message, data: null };
}
