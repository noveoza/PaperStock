import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Icon } from '../../components/Icon/Icon';
import { useAuth } from '../lib/auth';
import { useUser } from '../hooks/useUser';
import { formatKRW } from '../lib/format';
import s from './Sidebar.module.css';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const ITEMS: NavItem[] = [
  { to: '/app/portfolio', label: 'Portfolio', icon: 'pie-chart' },
  { to: '/app/markets', label: 'Markets', icon: 'line-chart' },
  { to: '/app/watchlist', label: 'Watchlist', icon: 'wallet' },
  { to: '/app/history', label: 'History', icon: 'bar-chart-3' },
];

export function Sidebar() {
  const { user: authUser, logout } = useAuth();
  const { user: userDoc, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } finally {
      setBusy(false);
    }
  };

  const initial = (authUser?.displayName || authUser?.email || '?')
    .slice(0, 1)
    .toUpperCase();

  return (
    <aside className={s.sidebar}>
      <Link to="/" className={s.brand}>
        <img src="/logo-mark.svg" width={22} height={22} alt="" />
        <span>Paperstock</span>
      </Link>

      <nav className={s.nav} aria-label="앱 메뉴">
        {ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `${s.link} ${isActive ? s.active : ''}`}
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={18} accent={isActive} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className={s.footer}>
        <div className={s.cashCard}>
          <div className={s.cashLab}>Cash</div>
          <div className={s.cashVal}>
            {userLoading ? '—' : formatKRW(userDoc?.cash ?? 0)}
          </div>
        </div>

        <div className={s.userCard}>
          <div className={s.avatar} aria-hidden="true">{initial}</div>
          <div className={s.userMeta}>
            <div className={s.userName}>
              {authUser?.displayName ?? userDoc?.display_name ?? '사용자'}
            </div>
            <div className={s.userEmail}>{authUser?.email ?? ''}</div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className={s.logout}
          disabled={busy}
        >
          <Icon name="x" size={14} />
          <span>{busy ? '로그아웃 중…' : '로그아웃'}</span>
        </button>
      </div>
    </aside>
  );
}
