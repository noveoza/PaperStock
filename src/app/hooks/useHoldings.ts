import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { watchHoldings, type Holding } from '../lib/firestore';

export function useHoldings(): { holdings: Holding[]; loading: boolean } {
  const { user, status } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }
    if (!user) {
      setHoldings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = watchHoldings(user.uid, (list) => {
      setHoldings(list);
      setLoading(false);
    });
    return unsub;
  }, [user, status]);

  return { holdings, loading };
}
