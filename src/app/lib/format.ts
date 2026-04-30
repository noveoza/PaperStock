// 통화·퍼센트·날짜 포맷터 + 등락 톤 헬퍼.
// 색상은 tokens.css 의 --gain / --loss 사용 — 본 모듈은 톤 키만 반환.

const KRW_FMT = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

export function formatKRW(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return KRW_FMT.format(value);
}

export function formatUSD(value: number): string {
  if (!Number.isFinite(value)) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrency(value: number, currency: string): string {
  if (!Number.isFinite(value)) return '-';
  const isKRW = currency === 'KRW';
  return new Intl.NumberFormat(isKRW ? 'ko-KR' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: isKRW ? 0 : 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '-';
  const sign = value > 0 ? '+' : value < 0 ? '' : '';
  return `${sign}${value.toFixed(2)}%`;
}

// KST 기준. Date | string | number(epoch ms or s) 모두 허용.
function toDate(input: Date | string | number): Date {
  if (input instanceof Date) return input;
  if (typeof input === 'number') {
    // 10자리면 epoch seconds 로 가정
    return new Date(input < 1e12 ? input * 1000 : input);
  }
  return new Date(input);
}

export function formatDate(input: Date | string | number): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return '-';
  // YYYY-MM-DD (KST)
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(d)
    .replace(/\.\s?/g, '-')
    .replace(/-$/, '');
}

export function formatDateTime(input: Date | string | number): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return '-';
  // MM/DD HH:mm (KST)
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const lookup: Record<string, string> = {};
  for (const p of parts) lookup[p.type] = p.value;
  return `${lookup.month}/${lookup.day} ${lookup.hour}:${lookup.minute}`;
}

export type DeltaTone = 'gain' | 'loss' | 'neutral';

export function getDeltaTone(value: number): DeltaTone {
  if (!Number.isFinite(value) || value === 0) return 'neutral';
  return value > 0 ? 'gain' : 'loss';
}
