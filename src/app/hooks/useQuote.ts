import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Quote {
  symbol: string;
  name: string;
  last_price: number;
  change: number;
  change_pct: number;
  currency: string;
  market: string;
  fetched_at: string;
}

const REFETCH_INTERVAL = 60_000;

export function quoteQueryOptions(symbol: string) {
  return {
    queryKey: ['markets', 'quote', symbol] as const,
    queryFn: () =>
      api.get<Quote>(`/api/v1/markets/quote?symbol=${encodeURIComponent(symbol)}`),
    refetchInterval: REFETCH_INTERVAL,
    staleTime: 30_000,
  };
}

export function useQuote(
  symbol: string | null | undefined,
): UseQueryResult<Quote, Error> {
  return useQuery({
    ...quoteQueryOptions(symbol ?? ''),
    enabled: !!symbol,
  });
}
