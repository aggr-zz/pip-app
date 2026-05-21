'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { exitChildMode } from '@/app/parent/children/actions';

export function ExitChildButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await exitChildMode();
      router.push('/parent');
      router.refresh();
    });
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
      {isPending ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" strokeOpacity="0.3" />
        </svg>
      ) : (
        /* Door/exit icon */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      )}
    </button>
  );
}
