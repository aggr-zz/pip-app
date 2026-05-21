'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveAllCompletions } from './actions';

export function ApproveAllButton({ completionIds }: { completionIds: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function handleClick() {
    startTransition(async () => {
      const result = await approveAllCompletions({ completionIds });
      if (result.ok) {
        setDone(true);
        setTimeout(() => router.refresh(), 800);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || done}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '10px 18px',
        background: done ? 'var(--color-mint-soft)' : 'var(--color-mint)',
        border: 'none',
        borderRadius: 'var(--radius-lg)',
        color: done ? 'var(--color-mint-deep)' : 'white',
        fontWeight: 600,
        fontSize: 14,
        fontFamily: 'inherit',
        cursor: isPending || done ? 'default' : 'pointer',
        transition: 'background 0.2s, opacity 0.2s',
        opacity: isPending ? 0.7 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {done ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Подтверждено!
        </>
      ) : isPending ? (
        'Подтверждаем…'
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
          Подтвердить все
        </>
      )}
    </button>
  );
}
