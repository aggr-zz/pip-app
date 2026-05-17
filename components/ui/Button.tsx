import { type ButtonHTMLAttributes, type ReactNode, forwardRef } from 'react';

type Variant = 'primary' | 'ink' | 'mint' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
}

const STYLES: Record<Variant, React.CSSProperties> = {
  primary: { background: 'var(--color-coral)', color: 'white' },
  ink: { background: 'var(--color-ink)', color: 'white' },
  mint: { background: 'var(--color-mint)', color: 'white' },
  ghost: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  },
  danger: { background: 'var(--status-danger)', color: 'white' },
};

const SIZES: Record<Size, React.CSSProperties> = {
  sm: { padding: '8px 14px', borderRadius: 'var(--radius-sm)', fontSize: 12.5 },
  md: { padding: '11px 18px', borderRadius: 'var(--radius-md)', fontSize: 13.5 },
  lg: { padding: '14px 22px', borderRadius: 'var(--radius-md)', fontSize: 14.5 },
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth = false, children, style, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      style={{
        ...STYLES[variant],
        ...SIZES[size],
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        fontWeight: 600,
        fontFamily: 'inherit',
        border: variant === 'ghost' ? '1px solid var(--border-default)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        transition: 'background 0.15s, transform 0.1s',
        width: fullWidth ? '100%' : undefined,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
});
