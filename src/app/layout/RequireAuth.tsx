import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import s from './RequireAuth.module.css';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className={s.loading} role="status" aria-live="polite">
        <span className={s.spinner} aria-hidden="true" />
        <span className={s.label}>불러오는 중…</span>
      </div>
    );
  }

  if (status === 'guest') {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }

  return <>{children}</>;
}
