import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { watchUser, type UserDoc } from '../lib/firestore';

export function useUser(): { user: UserDoc | null; loading: boolean } {
  const { user: authUser, status } = useAuth();
  const [doc, setDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') {
      setLoading(true);
      return;
    }
    if (!authUser) {
      setDoc(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = watchUser(authUser.uid, (u) => {
      setDoc(u);
      setLoading(false);
    });
    return unsub;
  }, [authUser, status]);

  return { user: doc, loading };
}
