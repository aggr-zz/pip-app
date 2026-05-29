'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { acceptFamilyInvite } from './inviteActions';

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleAccept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptFamilyInvite(token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDone(true);
      // Небольшая пауза чтобы показать success, потом редирект
      setTimeout(() => {
        router.push('/parent');
        router.refresh();
      }, 1000);
    });
  }

  if (done) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '16px',
          background: 'var(--color-mint-soft)',
          borderRadius: 'var(--radius-lg)',
          color: 'var(--color-mint-deep)',
          fontWeight: 600,
          fontSize: 15,
        }}
      >
        🎉 Ты в семье! Переходим…
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleAccept}
        disabled={isPending}
        style={{
          width: '100%',
          padding: '14px 20px',
          borderRadius: 'var(--radius-lg)',
          background: isPending ? 'var(--border-default)' : 'var(--color-coral)',
          color: 'white',
          fontWeight: 700,
          fontSize: 15,
          border: 'none',
          cursor: isPending ? 'not-allowed' : 'pointer',
          letterSpacing: '-0.01em',
          transition: 'background 0.15s',
        }}
      >
        {isPending ? 'Присоединяемся…' : 'Принять приглашение'}
      </button>
      {error && (
        <div
          style={{
            marginTop: 10,
            padding: '10px 14px',
            background: 'var(--status-danger-soft)',
            color: 'var(--status-danger)',
            borderRadius: 'var(--radius-md)',
            fontSize: 13.5,
          }}
        >
          {error}
        </div>
      )}
    </>
  );
}
