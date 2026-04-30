import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export type TradeSide = 'BUY' | 'SELL';

export interface TradeRequest {
  symbol: string;
  side: TradeSide;
  qty: number;
}

export interface TradeResponse {
  trade_id: string;
  symbol: string;
  side: TradeSide;
  qty: number;
  price: number;
  amount: number;
  currency: string;
  executed_at: string;
  holding_after: { qty: number; avg_price: number } | null;
  cash_after: number;
}

export function useTrade() {
  const qc = useQueryClient();
  return useMutation<TradeResponse, Error, TradeRequest>({
    mutationFn: (body) => api.post<TradeResponse>('/api/v1/trade', body),
    onSuccess: () => {
      // 시세는 캐시 무효화 (체결가 반영). holdings/trades/users 는 Firestore onSnapshot 으로 자동 갱신.
      qc.invalidateQueries({ queryKey: ['markets', 'quote'] });
    },
  });
}
