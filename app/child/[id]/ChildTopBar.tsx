'use client';

import { usePathname, useRouter } from 'next/navigation';
import { PipLogo } from '@/components/ui/PipLogo';

interface Props {
  childId: string;
  balance: number;
  availableTaskCount: number;
}

const MAIN_TAB_PATHS = (id: string) => [
  `/child/${id}`,
  `/child/${id}/shop`,
  `/child/${id}/achievements`,
  `/child/${id}/profile`,
];

export function ChildTopBar({ childId, balance, availableTaskCount }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const isMainTab = MAIN_TAB_PATHS(childId).some((p) => pathname === p);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        zIndex: 100,
        background: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
      }}
    >
      {/* Left: logo or back button */}
      {isMainTab ? (
        <PipLogo size={26} />
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

      {/* Right: balance + tasks badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Tasks pending badge */}
        {availableTaskCount > 0 && (
          <div style={{ position: 'relative' }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
              }}
            >
              ✅
            </div>
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                minWidth: 17,
                height: 17,
                borderRadius: 100,
                background: 'var(--color-coral)',
                color: 'white',
                fontSize: 10,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--bg-main)',
                padding: '0 3px',
                lineHeight: 1,
              }}
            >
              {availableTaskCount}
            </span>
          </div>
        )}

        {/* Balance pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            background: 'var(--color-gold-soft)',
            borderRadius: 100,
            padding: '5px 12px 5px 8px',
            color: 'var(--color-gold-deep)',
          }}
        >
          <span style={{ fontSize: 15 }}>🪙</span>
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
      </div>
    </header>
  );
}
