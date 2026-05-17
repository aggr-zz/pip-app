'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveCompletion, rejectCompletion } from '../actions';
import { Button } from '@/components/ui/Button';

type Mode = 'idle' | 'reduce' | 'reject';

export function ApprovalActions({
  completionId,
  fullAmount,
  childName,
}: {
  completionId: string;
  fullAmount: number;
  childName: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('idle');
  const [amount, setAmount] = useState(fullAmount);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleApprove(reduced: boolean = false) {
    setError(null);
    startTransition(async () => {
      const result = await approveCompletion({
        completionId,
        awarded: reduced ? amount : undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push('/parent/approvals');
      router.refresh();
    });
  }

  function handleReject() {
    setError(null);
    if (!reason.trim()) {
      setError('Напиши, почему отклоняешь — это поможет ребёнку');
      return;
    }

    startTransition(async () => {
      const result = await rejectCompletion({
        completionId,
        reason: reason.trim(),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push('/parent/approvals');
      router.refresh();
    });
  }

  // ─── REJECT MODE ──────────────────────────────────────────────────
  if (mode === 'reject') {
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
          Отклонить выполнение?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
          Монеты не начислятся. Напиши коротко, что не так — {childName} увидит это в своей истории.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Кровать не заправлена аккуратно. Попробуй ещё раз."
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
          <Button variant="danger" size="md" fullWidth onClick={handleReject} disabled={isPending}>
            {isPending ? 'Отклоняем…' : 'Отклонить'}
          </Button>
        </div>
      </section>
    );
  }

  // ─── REDUCE MODE ──────────────────────────────────────────────────
  if (mode === 'reduce') {
    const percent = fullAmount > 0 ? Math.round((amount / fullAmount) * 100) : 0;
    return (
      <section
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--color-coral)',
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
          Начислить частично?
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '0 0 18px', lineHeight: 1.5 }}>
          Например, если задача сделана наполовину или с замечаниями.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          <span style={{ color: 'var(--text-soft)' }}>Начислить</span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>
            {amount}
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-soft)', marginLeft: 4 }}>
              из {fullAmount} pip ({percent}%)
            </span>
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={fullAmount}
          step={1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          disabled={isPending}
          style={{ width: '100%', accentColor: 'var(--color-coral)', marginBottom: 16 }}
        />

        {/* Quick presets */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[25, 50, 75, 100].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(Math.round((fullAmount * p) / 100))}
              disabled={isPending}
              style={{
                flex: 1,
                padding: '7px',
                fontSize: 12,
                fontWeight: 600,
                background:
                  percent === p ? 'var(--color-coral)' : 'var(--bg-surface-2)',
                color: percent === p ? 'white' : 'var(--text-primary)',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {p}%
            </button>
          ))}
        </div>

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
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={() => handleApprove(true)}
            disabled={isPending}
          >
            {isPending ? 'Подтверждаем…' : `Начислить ${amount}`}
          </Button>
        </div>
      </section>
    );
  }

  // ─── IDLE: main approve / reduce / reject ─────────────────────────
  return (
    <section>
      {error && <ErrorBanner>{error}</ErrorBanner>}

      <Button
        variant="mint"
        size="lg"
        fullWidth
        onClick={() => handleApprove(false)}
        disabled={isPending}
        style={{ marginBottom: 10 }}
      >
        {isPending ? 'Подтверждаем…' : `Подтвердить · +${fullAmount} pip`}
      </Button>

      <div style={{ display: 'flex', gap: 8 }}>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => setMode('reduce')}
          disabled={isPending}
        >
          Начислить меньше
        </Button>
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={() => setMode('reject')}
          disabled={isPending}
          style={{ color: 'var(--status-danger)' }}
        >
          Отклонить
        </Button>
      </div>
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
