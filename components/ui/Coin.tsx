import type { ReactNode } from 'react';

/**
 * Маленькая золотая монетка (точка) — для inline-использования в подписях.
 */
export function CoinDot({ size = 11 }: { size?: number }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '100px',
        background: 'radial-gradient(circle at 30% 30%, var(--color-gold), var(--color-gold-deep))',
        border: '1px solid rgba(0,0,0,0.05)',
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Капсула для отображения суммы pip: монетка + число.
 */
export function CoinPill({ amount, sign }: { amount: number | string; sign?: '+' | '-' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'var(--color-gold-soft)',
        color: 'var(--color-gold-deep)',
        padding: '4px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <CoinDot size={10} />
      {sign}
      {amount}
    </span>
  );
}

/**
 * Большая карточка баланса. Для главного экрана ребёнка / профиля.
 */
export function CoinBalance({ amount, label = 'Твой баланс', extra }: {
  amount: number;
  label?: string;
  extra?: ReactNode;
}) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #FF8868, #EE6C4D)',
        color: 'white',
        borderRadius: 'var(--radius-xl)',
        padding: '18px 20px',
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 34,
          lineHeight: 1,
          letterSpacing: '-0.02em',
        }}
      >
        {amount.toLocaleString('ru-RU')}{' '}
        <span style={{ fontSize: 16, fontWeight: 500, opacity: 0.85 }}>pip</span>
      </div>
      {extra && <div style={{ marginTop: 12 }}>{extra}</div>}
    </div>
  );
}
