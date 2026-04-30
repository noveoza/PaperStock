import { Link } from 'react-router-dom';
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from 'react';
import s from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  children: ReactNode;
}

type ButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' };
type AnchorProps = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a'; href: string };
type LinkProps = BaseProps & { as: 'link'; to: string };

export type Props = ButtonProps | AnchorProps | LinkProps;

const cap = <T extends string>(str: T) =>
  (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>;

export function Button(props: Props) {
  const { variant = 'secondary', size = 'md', block, children } = props;
  const className = [
    s.btn,
    s[`btn${cap(variant)}` as keyof typeof s] as string,
    s[`btn${cap(size)}` as keyof typeof s] as string,
    block ? s.block : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (props.as === 'a') {
    const { as: _as, variant: _v, size: _s, block: _b, children: _c, ...rest } = props;
    return (
      <a className={className} {...rest}>
        {children}
      </a>
    );
  }
  if (props.as === 'link') {
    return (
      <Link className={className} to={props.to}>
        {children}
      </Link>
    );
  }
  const { as: _as, variant: _v, size: _s, block: _b, children: _c, ...rest } = props;
  return (
    <button className={className} {...rest}>
      {children}
    </button>
  );
}
