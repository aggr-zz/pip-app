'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { deleteMyAccount } from './actions';

const CONFIRM_WORD = 'УДАЛИТЬ';

/**
 * Удаление аккаунта изнутри приложения (требование App Store 5.1.1(v)).
 * Находимо и не запрятано, но с защитой от случайного нажатия: подтверждение словом.
 */
export function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canDelete = word.trim().toUpperCase() === CONFIRM_WORD;

  function handleDelete() {
    if (!canDelete) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMyAccount();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Аккаунта больше нет. scope:'local' — не ходим в сеть с JWT удалённого
      // пользователя (это вернёт 403 и оставит cookie живой → петля редиректов),
      // а просто чистим локальную сессию.
      try {
        await createClient().auth.signOut({ scope: 'local' });
      } catch {
        /* сессия и так недействительна */
      }
      router.push('/');
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          background: 'transparent',
          border: '1px solid var(--status-danger)',
          color: 'var(--status-danger)',
          padding: '12px',
          borderRadius: 'var(--radius-lg)',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}
      >
        Удалить аккаунт
      </button>
    );
  }

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1.5px solid var(--status-danger)',
        borderRadius: 'var(--radius-xl)',
        padding: '18px 16px',
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--status-danger)' }}>
        Удалить аккаунт навсегда?
      </div>
      <p style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-soft)', margin: '0 0 6px' }}>
        Будут безвозвратно удалены: профили детей, задания, награды, история начислений
        и все загруженные фото. Восстановить будет нельзя.
      </p>
      <p style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--text-muted)', margin: '0 0 14px' }}>
        Если в семье есть второй родитель — удалится только ваш профиль, данные семьи
        останутся у него.
      </p>

      <label style={{ display: 'block', fontSize: 12.5, color: 'var(--text-soft)', marginBottom: 6 }}>
        Для подтверждения введите <b>{CONFIRM_WORD}</b>
      </label>
      <input
        value={word}
        onChange={(e) => { setWord(e.target.value); setError(null); }}
        placeholder={CONFIRM_WORD}
        autoComplete="off"
        disabled={isPending}
        style={{
          width: '100%',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          padding: '10px 12px',
          fontSize: 14,
          fontFamily: 'inherit',
          marginBottom: 12,
          boxSizing: 'border-box',
        }}
      />

      {error && (
        <div
          role="alert"
          style={{
            background: 'var(--status-danger-soft)',
            color: 'var(--status-danger)',
            padding: '9px 12px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13,
            marginBottom: 12,
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={() => { setOpen(false); setWord(''); setError(null); }}
          disabled={isPending}
          style={{
            flex: 1,
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            padding: '11px',
            borderRadius: 'var(--radius-lg)',
            fontSize: 14,
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={!canDelete || isPending}
          style={{
            flex: 1,
            background: canDelete ? 'var(--status-danger)' : 'var(--bg-surface-2)',
            border: 'none',
            color: canDelete ? 'white' : 'var(--text-muted)',
            padding: '11px',
            borderRadius: 'var(--radius-lg)',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'inherit',
            cursor: canDelete && !isPending ? 'pointer' : 'not-allowed',
          }}
        >
          {isPending ? 'Удаляем…' : 'Удалить навсегда'}
        </button>
      </div>
    </div>
  );
}
