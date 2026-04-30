import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface SearchResult {
  symbol: string;
  name: string;
  market: string;
  currency: string;
}

interface SearchResponse {
  results: SearchResult[];
}

export function useSearch(
  query: string,
): UseQueryResult<SearchResult[], Error> {
  const q = query.trim();
  return useQuery({
    queryKey: ['markets', 'search', q] as const,
    queryFn: async () => {
      const data = await api.get<SearchResponse>(
        `/api/v1/markets/search?q=${encodeURIComponent(q)}`,
      );
      return data.results;
    },
    enabled: q.length > 0,
    staleTime: 30_000,
  });
}
