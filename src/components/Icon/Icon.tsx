interface Props {
  name: string;
  size?: number;
  className?: string;
  accent?: boolean;
  alt?: string;
}

export function Icon({ name, size = 20, className, accent, alt = '' }: Props) {
  return (
    <img
      src={`/icons/${name}.svg`}
      width={size}
      height={size}
      alt={alt}
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        filter: accent ? 'var(--icon-filter-accent)' : 'var(--icon-filter)',
        transition: 'filter var(--dur-2) var(--ease)',
      }}
    />
  );
}
