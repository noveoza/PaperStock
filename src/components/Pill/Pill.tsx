import type { ReactNode } from 'react';
import s from './Pill.module.css';

interface Props {
  children: ReactNode;
  variant?: 'neutral' | 'accent' | 'gain' | 'loss';
  dot?: boolean;
}

export function Pill({ children, variant = 'neutral', dot }: Props) {
  return (
    <span className={`${s.pill} ${s[variant]}`}>
      {dot && <span className={s.dot} />}
      {children}
    </span>
  );
}
