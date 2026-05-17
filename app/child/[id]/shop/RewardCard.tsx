'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { orderReward } from './actions';
import { CoinPill } from '@/components/ui/Coin';

interface RewardCardProps {
  rewardId: string;
  childId: string;
  title: string;
  description: string | null;
  icon: string;
  coinCost: number;
  canAfford: boolean;
  alreadyOrdered: boolean;
}

type State = 'idle' | 'confirm' | 'ordered';

export function RewardCard({
  rewardId,
  childId,
  title,
  description,
  icon,
  coinCost,
  canAfford,
  alreadyOrdered,
}: RewardCardProps) {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isBlocked = alreadyOrdered || !canAfford;

  function handleTap() {
    if (isBlocked || isPending) return;
    if (state === 'idle') {
      setState('confirm');
      return;
    }
  }

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await orderReward({ rewardId, childId });
      if (!result.ok) {
        setError(result.error);
        setState('idle');
        return;
      }
      setState('ordered');
      setTimeout(() => {
        router.refresh();
      }, 1200);
    });
  }

  function handleCancel() {
    setState('idle');
    setError(null);
  }

  // ─── Ordered state ────────────────────────────────────────────────
  if (state === 'ordered') {
    return (
      <div
        style={{
          background: 'var(--color-mint-soft)',
          border: '1px solid var(--color-mint)',
          borderRadius: 'var(--radius-xl)',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 100,
            background: 'var(--color-mint)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-mint-deep)' }}>
            Заказано! Жди когда родитель выдаст
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-mint-deep)', opacity: 0.8, marginTop: 2 }}>
            Списано {coinCost} pip
          </div>
        </div>
      </div>
    );
  }

  // ─── Confirm state ────────────────────────────────────────────────
  if (state === 'confirm') {
    return (
      <div
        style={{
          background: 'var(--color-coral-soft)',
          border: '2px solid var(--color-coral)',
          borderRadius: 'var(--radius-xl)',
          padding: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>
              Купить «{title}»?
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
              Спишется {coinCost} pip
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: 'var(--status-danger-soft)',
              color: 'var(--status-danger)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-md)',
              fontSize: 12.5,
              marginBottom: 8,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            style={{
              flex: 1,
              padding: '10px',
              background: 'white',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 13.5,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            Нет
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            style={{
              flex: 2,
              padding: '10px',
              background: 'var(--color-coral)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              color: 'white',
              fontWeight: 600,
              fontSize: 13.5,
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {isPending ? 'Заказываем…' : `Да, купить за ${coinCost}`}
          </button>
        </div>
      </div>
    );
  }

  // ─── Idle state ──────────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={handleTap}
      disabled={isBlocked || isPending}
      style={{
        width: '100%',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-xl)',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: isBlocked ? 'default' : 'pointer',
        opacity: isBlocked ? 0.55 : 1,
        textAlign: 'left',
        fontFamily: 'inherit',
        transition: 'border-color 0.15s, transform 0.1s',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'var(--color-gold-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            lineHeight: 1.3,
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: 11.5,
              color: 'var(--text-soft)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {description}
          </div>
        )}
        {!canAfford && !alreadyOrdered && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Ещё не хватает монет
          </div>
        )}
        {alreadyOrdered && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            Уже получал(а) — больше нельзя
          </div>
        )}
      </div>

      <CoinPill amount={coinCost} />
    </button>
  );
}
