'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { enterChildMode } from '../actions';
import { Button } from '@/components/ui/Button';

export function EnterChildMode({ childId, childName }: { childId: string; childName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^\d{4}$/.test(pin)) {
      setError('PIN должен быть из 4 цифр');
      return;
    }

    startTransition(async () => {
      const result = await enterChildMode({ childId, pin });
      if (!result.ok) {
        setError(result.error);
        setPin(''); // очистить PIN при ошибке
        return;
      }
      router.push(`/child/${childId}`);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={() => setOpen(true)}
      >
        Войти в режим {childName} →
      </Button>
    );
  }

  return (
    <section
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-2xl)',
        padding: '24px',
      }}
    >
      <h3
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 17,
          margin: '0 0 8px',
        }}
      >
        Введи PIN ребёнка
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '0 0 18px', lineHeight: 1.5 }}>
        Чтобы войти в режим {childName}. Доступ откроется на час, потом снова попросим PIN.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <input
          type="password"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, '').slice(0, 4));
            setError(null);
          }}
          placeholder="• • • •"
          autoFocus
          inputMode="numeric"
          maxLength={4}
          autoComplete="off"
          disabled={isPending}
          style={{
            width: '100%',
            textAlign: 'center',
            fontFamily: 'var(--font-display)',
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: '0.4em',
            background: 'var(--bg-surface)',
            border: '2px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 14px',
            color: 'var(--text-primary)',
            outline: 'none',
            marginBottom: 14,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-coral)';
            e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-coral-soft)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-default)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />

        {error && (
          <div
            role="alert"
            style={{
              background: 'var(--status-danger-soft)',
              color: 'var(--status-danger)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              marginBottom: 14,
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <Button
            type="button"
            variant="ghost"
            size="md"
            disabled={isPending}
            onClick={() => {
              setOpen(false);
              setPin('');
              setError(null);
            }}
            style={{ flex: 1 }}
          >
            Отмена
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isPending || pin.length !== 4}
            style={{ flex: 2 }}
          >
            {isPending ? 'Проверяем…' : 'Войти'}
          </Button>
        </div>
      </form>
    </section>
  );
}
