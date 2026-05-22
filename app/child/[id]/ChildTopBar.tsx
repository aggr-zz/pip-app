'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PipLogo } from '@/components/ui/PipLogo';

interface Props {
  childId: string;
  balance: number;
  streak: number;
}

const MAIN_TAB_PATHS = (id: string) => [
  `/child/${id}`,
  `/child/${id}/shop`,
  `/child/${id}/achievements`,
  `/child/${id}/profile`,
];

function CoinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="var(--color-gold)" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold"
        fill="rgba(255,255,255,0.9)" fontFamily="sans-serif">P</text>
    </svg>
  );
}

export function ChildTopBar({ childId, balance, streak }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const isMainTab = MAIN_TAB_PATHS(childId).some((p) => pathname === p);

  return (
    <header
      style={{
        height: 52,
        background: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}
    >
      {/* Left: logo (+ streak on main tabs) or back button */}
      {isMainTab ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <PipLogo size={26} />
          {streak > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'var(--color-gold-soft)',
              borderRadius: 100,
              padding: '4px 10px 4px 7px',
              color: 'var(--color-gold-deep)',
            }}>
              <span style={{ fontSize: 14, lineHeight: 1 }}>🔥</span>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '-0.01em',
              }}>
                {streak}
              </span>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => router.back()}
          aria-label="Назад"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-primary)',
            flexShrink: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
      )}

      {/* Right: balance pill only */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: 'var(--color-gold-soft)',
          borderRadius: 100,
          padding: '5px 12px 5px 7px',
          color: 'var(--color-gold-deep)',
        }}
      >
        <CoinIcon />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 14,
            letterSpacing: '-0.01em',
          }}
        >
          {balance.toLocaleString('ru-RU')}
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, letterSpacing: '0.04em' }}>
          PIP
        </span>
      </div>
    </header>
  );
}
