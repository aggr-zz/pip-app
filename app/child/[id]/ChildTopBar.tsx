'use client';

import { useState, useEffect, useRef } from 'react';
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

function daysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

function streakHint(n: number): string {
  if (n === 0) return 'Начни выполнять задания каждый день!';
  if (n < 3) return 'Отличное начало! Не останавливайся 💪';
  if (n < 7) return 'Уже ' + n + ' ' + daysWord(n) + ' подряд. Так держать! 🔥';
  if (n < 14) return 'Целая неделя! Ты настоящий чемпион ⭐';
  if (n < 30) return n + ' ' + daysWords(n) + ' без пропусков — это круто! 🏆';
  return 'Невероятно! ' + n + ' ' + daysWords(n) + ' подряд. Легенда! 🥇';
}

function daysWords(n: number): string {
  return daysWord(n);
}

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
  const [showTooltip, setShowTooltip] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isMainTab = MAIN_TAB_PATHS(childId).some((p) => pathname === p);

  function handleStreakClick() {
    setShowTooltip(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShowTooltip(false), 2800);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PipLogo size={26} />
          {streak > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={handleStreakClick}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'var(--color-gold-soft)',
                  borderRadius: 100,
                  padding: '5px 11px 5px 8px',
                  color: 'var(--color-gold-deep)',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1 }}>🔥</span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                }}>
                  Стрик {streak} {daysWord(streak)}
                </span>
              </button>

              {/* Tooltip */}
              {showTooltip && (
                <div
                  role="tooltip"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    zIndex: 300,
                    background: 'var(--color-ink)',
                    color: 'white',
                    borderRadius: 10,
                    padding: '8px 12px',
                    fontSize: 12.5,
                    fontWeight: 500,
                    lineHeight: 1.4,
                    whiteSpace: 'nowrap',
                    maxWidth: 220,
                    whiteSpaceCollapse: 'preserve',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                    animation: 'pip-fade-in 0.15s ease',
                  }}
                >
                  {streakHint(streak)}
                  {/* Arrow */}
                  <div style={{
                    position: 'absolute',
                    top: -5,
                    left: 16,
                    width: 10,
                    height: 10,
                    background: 'var(--color-ink)',
                    transform: 'rotate(45deg)',
                    borderRadius: 2,
                  }} />
                </div>
              )}
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
