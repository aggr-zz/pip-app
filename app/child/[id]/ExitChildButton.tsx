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
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-soft)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-md)',
        fontSize: 12.5,
        fontWeight: 500,
        cursor: isPending ? 'wait' : 'pointer',
        fontFamily: 'inherit',
      }}
    >
      {isPending ? '...' : 'Выйти'}
    </button>
  );
}
