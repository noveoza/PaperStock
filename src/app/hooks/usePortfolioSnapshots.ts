import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { HistoryRange } from './useHistory';

export interface SnapshotPoint {
  /** ISO 날짜 — `YYYY-MM-DD` (KST 기준, 백엔드가 결정) */
  date: string;
  total_krw: number;
}

export interface SnapshotsResponse {
  range: HistoryRange;
  points: SnapshotPoint[];
}

/** 일별 총자산 시계열 (자산 차트용). 점 0개면 신규 사용자. */
export function usePortfolioSnapshots(
  range: HistoryRange,
): UseQueryResult<SnapshotsResponse, Error> {
  return useQuery({
    queryKey: ['portfolio', 'snapshots', range] as const,
    queryFn: () =>
      api.get<SnapshotsResponse>(
        `/api/v1/portfolio/snapshots?range=${range}`,
      ),
    staleTime: 60_000,
  });
}
