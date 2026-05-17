'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adjustBalance } from './actions';
import { Button } from '@/components/ui/Button';
import { CoinDot } from '@/components/ui/Coin';

type Direction = 'plus' | 'minus';

export function AdjustForm({
  childId,
  childName,
  currentBalance,
}: {
  childId: string;
  childName: string;
  currentBalance: number;
}) {
  const router = useRouter();
  const [direction, setDirection] = useState<Direction>('plus');
  const [amount, setAmount] = useState(20);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ amount: number; newBalance: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  const signedAmount = direction === 'plus' ? amount : -amount;
  const balanceAfter = currentBalance + signedAmount;
  const wouldBeNegative = balanceAfter < 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!reason.trim()) {
      setError('Укажи причину — ребёнок увидит её в истории');
      return;
    }
    if (wouldBeNegative) {
      setError(`Баланс уйдёт в минус: ${currentBalance} − ${amount} = ${balanceAfter}`);
      return;
    }

    startTransition(async () => {
      const result = await adjustBalance({
        profileId: childId,
        amount: signedAmount,
        reason: reason.trim(),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess({ amount: signedAmount, newBalance: result.newBalance });
      setAmount(20);
      setReason('');

      setTimeout(() => setSuccess(null), 4000);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {success && (
        <div
          role="status"
          style={{
            background: 'var(--color-mint-soft)',
            color: 'var(--color-mint-deep)',
            border: '1px solid var(--color-mint)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            fontSize: 13,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 18 }}>✓</span>
          <span>
            Записано: {success.amount > 0 ? '+' : ''}
            <strong>{success.amount} pip</strong> для {childName}. Баланс: {success.newBalance}
          </span>
        </div>
      )}

      {/* Direction toggle */}
      <Label>Направление</Label>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 18,
        }}
      >
        <button
          type="button"
          onClick={() => setDirection('plus')}
          disabled={isPending}
          style={directionButtonStyle(direction === 'plus', 'plus')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Бонус
        </button>
        <button
          type="button"
          onClick={() => setDirection('minus')}
          disabled={isPending}
          style={directionButtonStyle(direction === 'minus', 'minus')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
          Штраф
        </button>
      </div>

      {/* Amount slider */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <Label asInline>Сколько pip</Label>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '-0.015em',
            color: direction === 'plus' ? 'var(--color-mint-deep)' : 'var(--status-danger)',
          }}
        >
          {direction === 'plus' ? '+' : '−'}
          {amount}
        </div>
      </div>
      <input
        type="range"
        min={1}
        max={500}
        step={1}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        disabled={isPending}
        style={{
          width: '100%',
          accentColor: direction === 'plus' ? 'var(--color-mint)' : 'var(--color-coral)',
          marginBottom: 8,
        }}
      />
      {/* Quick presets */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[10, 25, 50, 100, 200].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setAmount(preset)}
            disabled={isPending}
            style={{
              flex: 1,
              padding: '7px',
              fontSize: 12,
              fontWeight: 600,
              background: amount === preset ? 'var(--color-ink)' : 'var(--bg-surface-2)',
              color: amount === preset ? 'white' : 'var(--text-primary)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Reason */}
      <Label>Причина</Label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={direction === 'plus' ? 'Помог соседке с покупками' : 'Не сделал уборку второй раз'}
        rows={2}
        maxLength={200}
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
          marginBottom: 16,
        }}
      />

      {/* Live preview */}
      <div
        style={{
          background: wouldBeNegative ? 'var(--status-danger-soft)' : 'var(--bg-surface-2)',
          border: `1px solid ${wouldBeNegative ? 'var(--status-danger)' : 'var(--border-soft)'}`,
          borderRadius: 'var(--radius-md)',
          padding: '10px 14px',
          fontSize: 13,
          color: wouldBeNegative ? 'var(--status-danger)' : 'var(--text-soft)',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <CoinDot size={11} />
        {wouldBeNegative ? (
          <>Баланс уйдёт в минус: {currentBalance} − {amount} = {balanceAfter}</>
        ) : (
          <>
            После: {currentBalance} {direction === 'plus' ? '+' : '−'} {amount} ={' '}
            <strong style={{ color: 'var(--text-primary)' }}>{balanceAfter} pip</strong>
          </>
        )}
      </div>

      {error && (
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
          {error}
        </div>
      )}

      <Button
        type="submit"
        variant={direction === 'plus' ? 'mint' : 'danger'}
        size="lg"
        fullWidth
        disabled={isPending || wouldBeNegative || !reason.trim()}
      >
        {isPending ? 'Применяем…' : `${direction === 'plus' ? 'Начислить' : 'Списать'} ${amount} pip`}
      </Button>
    </form>
  );
}

function Label({ children, asInline = false }: { children: React.ReactNode; asInline?: boolean }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--text-soft)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: asInline ? 0 : 6,
        display: asInline ? 'inline-block' : 'block',
      }}
    >
      {children}
    </div>
  );
}

function directionButtonStyle(active: boolean, direction: Direction): React.CSSProperties {
  const activeBg = direction === 'plus' ? 'var(--color-mint)' : 'var(--color-coral)';
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px',
    fontSize: 14,
    fontWeight: 600,
    background: active ? activeBg : 'var(--bg-surface)',
    color: active ? 'white' : 'var(--text-primary)',
    border: `1px solid ${active ? activeBg : 'var(--border-default)'}`,
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'background 0.15s, border-color 0.15s',
  };
}
