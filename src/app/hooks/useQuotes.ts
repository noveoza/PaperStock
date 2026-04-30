import { useQueries } from '@tanstack/react-query';
import { quoteQueryOptions, type Quote } from './useQuote';

export interface UseQuotesResult {
  quotes: Record<string, Quote | undefined>;
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
}

/** 여러 심볼의 시세를 병렬 fetch. queryKey 는 useQuote 와 동일하므로 캐시 공유. */
export function useQuotes(symbols: string[]): UseQuotesResult {
  const results = useQueries({
    queries: symbols.map((symbol) => quoteQueryOptions(symbol)),
  });

  const quotes: Record<string, Quote | undefined> = {};
  const errors: Error[] = [];
  let isLoading = false;
  let isError = false;

  results.forEach((r, i) => {
    const sym = symbols[i];
    if (sym) quotes[sym] = r.data;
    if (r.isLoading) isLoading = true;
    if (r.isError) {
      isError = true;
      if (r.error instanceof Error) errors.push(r.error);
    }
  });

  return { quotes, isLoading, isError, errors };
}
