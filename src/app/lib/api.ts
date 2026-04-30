import { auth } from './firebase';
import { HttpError } from './httpError';

const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:4000';

interface Envelope<T> {
  status_code: number;
  message: string;
  data: T;
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let json: Envelope<T> | null = null;
  try {
    json = (await res.json()) as Envelope<T>;
  } catch {
    /* 비-JSON 응답 */
  }

  if (!res.ok || !json || json.status_code >= 400) {
    const status = json?.status_code ?? res.status;
    const message = json?.message ?? `요청에 실패했습니다 (${status})`;
    throw new HttpError(status, message);
  }
  return json.data;
}

export const api = {
  get: <T>(path: string) => call<T>('GET', path),
  post: <T>(path: string, body?: unknown) => call<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => call<T>('PUT', path, body),
  delete: <T>(path: string) => call<T>('DELETE', path),
};
