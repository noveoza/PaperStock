import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import type { Theme } from '../../styles/useTheme';
import s from './Nav.module.css';

interface Props {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Nav({ theme, onToggleTheme }: Props) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`${s.nav} ${scrolled ? s.scrolled : ''}`}>
      <div className={s.inner}>
        <Link className={s.brand} to="/">
          <img src="/logo-mark.svg" width="22" height="22" alt="" />
          <span>Paperstock</span>
        </Link>
        <div className={s.links}>
          <NavLink to="/" end>Product</NavLink>
          <NavLink to="/pricing">Pricing</NavLink>
          <NavLink to="/docs">Docs</NavLink>
          <NavLink to="/changelog">Changelog</NavLink>
        </div>
        <div className={s.cta}>
          <button
            type="button"
            onClick={onToggleTheme}
            className={s.themeBtn}
            aria-label="Toggle theme"
          >
            <Icon name={theme === 'dark' ? 'sparkles' : 'circle-dot'} size={16} />
          </button>
          <Button variant="ghost" size="sm" as="link" to="/login">log in</Button>
          <Button variant="primary" size="sm" as="link" to="/signup">
            get started <span className={s.arrow}>→</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
