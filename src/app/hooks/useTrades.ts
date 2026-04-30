import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { watchTrades, type TradeDoc } from '../lib/firestore';

export function useTrades(): { trades: TradeDoc[]; loading: boolean } {
  const { user, status } = useAuth();
  const [trades, setTrades] = useState<TradeDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }
    if (!user) {
      setTrades([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = watchTrades(user.uid, (list) => {
      setTrades(list);
      setLoading(false);
    });
    return unsub;
  }, [user, status]);

  return { trades, loading };
}
