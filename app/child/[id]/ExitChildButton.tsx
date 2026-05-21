'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { exitChildMode } from '@/app/parent/children/actions';

export function ExitChildButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await exitChildMode();
      router.push('/parent');
      router.refresh();
    });
  }

  if (fullWidth) {
    return (
      <button
        onClick={handleClick}
        disabled={isPending}
        style={{
          width: '100%',
          padding: '14px 20px',
          borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          cursor: isPending ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          fontSize: 15,
          fontWeight: 600,
          transition: 'background 0.15s',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {isPending ? 'Выходим…' : 'Выйти из режима ребёнка'}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title="Выйти из режима ребёнка"
      aria-label="Выйти"
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        color: isPending ? 'var(--text-muted)' : 'var(--text-soft)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isPending ? 'wait' : 'pointer',
        flexShrink: 0,
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </svg>
    </button>
  );
}
