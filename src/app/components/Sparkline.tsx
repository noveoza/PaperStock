import { useHistory, type HistoryRange } from '../hooks/useHistory';
import s from './Sparkline.module.css';

interface Props {
  symbol: string;
  range?: HistoryRange;
  width?: number;
  height?: number;
}

/**
 * 종목 close 가격 추이를 그리는 미니 라인. 직접 SVG path 로 가볍게.
 * 데이터는 기존 `useHistory` 훅 (queryKey ['markets','history',symbol,range]) 와 캐시 공유.
 */
export function Sparkline({
  symbol,
  range = '1m',
  width = 96,
  height = 28,
}: Props) {
  const { data, isLoading, isError } = useHistory(symbol, range);
  const candles = data?.candles ?? [];

  if (isLoading || isError || candles.length < 2) {
    return (
      <div
        className={s.placeholder}
        style={{ width: '100%', maxWidth: width, height }}
        aria-hidden="true"
      />
    );
  }

  const closes: number[] = candles.map((c) => c.c);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;

  const padY = 2;
  const usableH = height - padY * 2;
  const stepX = closes.length > 1 ? width / (closes.length - 1) : width;

  const path = closes
    .map((v, i) => {
      const x = i * stepX;
      const y = padY + (1 - (v - min) / span) * usableH;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const first = closes[0] ?? 0;
  const last = closes[closes.length - 1] ?? 0;
  const trendClass =
    last > first ? s.gain : last < first ? s.loss : s.neutral;

  return (
    <svg
      className={`${s.svg} ${trendClass}`}
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`${symbol} ${range} 추이`}
    >
      <path
        d={path}
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
