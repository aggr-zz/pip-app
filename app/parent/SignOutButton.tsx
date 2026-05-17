'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      style={{
        background: 'transparent',
        border: '1px solid var(--border-default)',
        color: 'var(--text-soft)',
        padding: '6px 12px',
        borderRadius: 'var(--radius-md)',
        fontSize: 12.5,
        fontWeight: 500,
        cursor: isPending ? 'wait' : 'pointer',
        fontFamily: 'inherit',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-surface-2)';
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--text-soft)';
      }}
    >
      {isPending ? 'Выходим…' : 'Выйти'}
    </button>
  );
}
