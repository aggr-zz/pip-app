'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { fulfillOrder, cancelOrder } from '../actions';
import { Button } from '@/components/ui/Button';

type Mode = 'idle' | 'cancel';

export function OrderActions({
  orderId,
  childName,
  cost,
}: {
  orderId: string;
  childName: string;
  cost: number;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('idle');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFulfill() {
    setError(null);
    startTransition(async () => {
      const result = await fulfillOrder(orderId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/parent/orders');
      router.refresh();
    });
  }

  function handleCancel() {
    setError(null);
    if (!reason.trim()) {
      setError('Напиши причину, чтобы ребёнок понимал, почему отменено');
      return;
    }

    startTransition(async () => {
      const result = await cancelOrder({ orderId, reason: reason.trim() });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/parent/orders');
      router.refresh();
    });
  }

  if (mode === 'cancel') {
    return (
      <section
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--status-danger)',
          borderRadius: 'var(--radius-2xl)',
          padding: 20,
        }}
      >
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 17,
            margin: '0 0 6px',
          }}
        >
          Отменить заказ?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
          {childName} получит назад {cost} pip. Напиши почему — это появится в истории ребёнка.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Например: на этой неделе не получается, давай в выходные"
          rows={3}
          maxLength={500}
          disabled={isPending}
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 12px',
            fontFamily: 'inherit',
            fontSize: 14,
            color: 'var(--text-primary)',
            resize: 'vertical',
            marginBottom: 12,
          }}
        />

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => {
              setMode('idle');
              setError(null);
            }}
            disabled={isPending}
          >
            Отмена
          </Button>
          <Button variant="danger" size="md" fullWidth onClick={handleCancel} disabled={isPending}>
            {isPending ? 'Отменяем…' : `Отменить · вернуть ${cost}`}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section>
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Button
        variant="mint"
        size="lg"
        fullWidth
        onClick={handleFulfill}
        disabled={isPending}
        style={{ marginBottom: 10 }}
      >
        {isPending ? 'Отмечаем…' : 'Выдал(а) ✓'}
      </Button>

      <Button
        variant="ghost"
        size="md"
        fullWidth
        onClick={() => setMode('cancel')}
        disabled={isPending}
        style={{ color: 'var(--status-danger)' }}
      >
        Отменить заказ
      </Button>
    </section>
  );
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        background: 'var(--status-danger-soft)',
        color: 'var(--status-danger)',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        fontSize: 13.5,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}
