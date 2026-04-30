import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';

export type HistoryRange = '1d' | '1w' | '1m' | '3m' | '1y' | 'all';

export interface Candle {
  t: number; // epoch seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

export interface HistoryResponse {
  symbol: string;
  range: HistoryRange;
  candles: Candle[];
}

export function useHistory(
  symbol: string | null | undefined,
  range: HistoryRange,
): UseQueryResult<HistoryResponse, Error> {
  return useQuery({
    queryKey: ['markets', 'history', symbol, range] as const,
    queryFn: () =>
      api.get<HistoryResponse>(
        `/api/v1/markets/history?symbol=${encodeURIComponent(symbol!)}&range=${range}`,
      ),
    enabled: !!symbol,
    staleTime: 60_000,
  });
}
