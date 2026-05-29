'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { orderReward } from './actions';
import { setGoal, clearGoal } from './goalActions';

interface RewardCardProps {
  rewardId: string;
  childId: string;
  title: string;
  description: string | null;
  icon: string;
  coinCost: number;
  balance: number;
  canAfford: boolean;
  alreadyOrdered: boolean;
  isGoal?: boolean;
  hasAnyGoal?: boolean;
}

type State = 'idle' | 'confirm' | 'ordered';

// ─── Icon gradients — rotate through warm palette ──────────────────────────
const ICON_GRADIENTS = [
  'linear-gradient(135deg, #FFB997, #EE6C4D)',
  'linear-gradient(135deg, #FFE39A, #D4A12E)',
  'linear-gradient(135deg, #95D5B2, #5BA890)',
  'linear-gradient(135deg, #B3DCFA, #5B85C9)',
  'linear-gradient(135deg, #FFC1CC, #E27396)',
];

function iconGradient(index: number) {
  return ICON_GRADIENTS[index % ICON_GRADIENTS.length];
}

// ─── Coin icon ─────────────────────────────────────────────────────────────
function CoinIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="var(--color-gold)" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold"
        fill="rgba(255,255,255,0.9)" fontFamily="sans-serif">P</text>
    </svg>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function RewardCard({
  rewardId,
  childId,
  title,
  description,
  icon,
  coinCost,
  balance,
  canAfford,
  alreadyOrdered,
  cardIndex = 0,
  isGoal = false,
  hasAnyGoal = false,
}: RewardCardProps & { cardIndex?: number }) {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [goalPending, startGoalTransition] = useTransition();

  function handleGoalToggle() {
    startGoalTransition(async () => {
      if (isGoal) {
        await clearGoal({ childId });
      } else {
        await setGoal({ childId, rewardId });
      }
      router.refresh();
    });
  }

  const isBlocked = alreadyOrdered;
  const pct = coinCost > 0 ? Math.min(100, Math.round((balance / coinCost) * 100)) : 100;
  const need = Math.max(0, coinCost - balance);
  const gradient = canAfford
    ? 'linear-gradient(135deg, #FFE39A, #D4A12E)'  // gold when affordable
    : iconGradient(cardIndex);

  function handleBuy() {
    if (isBlocked || isPending || state === 'ordered') return;
    if (!canAfford) return;
    setState('confirm');
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
      setTimeout(() => router.refresh(), 1400);
    });
  }

  function handleCancel() {
    setState('idle');
    setError(null);
  }

  // ─── Card ────────────────────────────────────────────────────────────────
  const isOrdered = state === 'ordered';
  const cardBg = isOrdered
    ? 'var(--color-mint-soft)'
    : isBlocked
      ? 'var(--bg-surface-2)'
      : 'var(--bg-surface)';
  const cardBorder = isOrdered
    ? '1.5px solid var(--color-mint)'
    : isBlocked
      ? '1px dashed var(--border-default)'
      : canAfford
        ? '1.5px solid var(--color-gold)'
        : '1px solid var(--border-soft)';

  return (
    <>
      {/* ── Card ─────────────────────────────────────────────────────── */}
      <div
        style={{
          background: cardBg,
          border: cardBorder,
          borderRadius: 'var(--radius-xl)',
          padding: '16px 12px 14px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          opacity: isBlocked ? 0.6 : 1,
          boxShadow: canAfford && !isBlocked && !isOrdered
            ? '0 4px 18px rgba(242, 193, 78, 0.2)'
            : 'none',
          position: 'relative',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
      >
        {/* Affordable badge */}
        {canAfford && !isBlocked && !isOrdered && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--color-gold)',
              boxShadow: '0 0 6px var(--color-gold)',
            }}
          />
        )}

        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: isOrdered
              ? 'var(--color-mint)'
              : isBlocked
                ? 'var(--border-default)'
                : gradient,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isOrdered ? 0 : 30,
            marginBottom: 10,
            boxShadow: isOrdered || isBlocked
              ? 'none'
              : '0 4px 16px rgba(0,0,0,0.12)',
            transition: 'background 0.3s',
          }}
        >
          {isOrdered ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            icon
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 13.5,
            lineHeight: 1.25,
            color: isOrdered ? 'var(--color-mint-deep)' : 'var(--text-primary)',
            marginBottom: 6,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            minHeight: '2.5em',
          }}
        >
          {isOrdered ? 'Заказано!' : title}
        </div>

        {isOrdered ? (
          <div style={{ fontSize: 11, color: 'var(--color-mint-deep)', opacity: 0.8 }}>
            Ждёт подтверждения
          </div>
        ) : isBlocked ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Уже получено
          </div>
        ) : (
          <>
            {/* Progress bar */}
            <div style={{ width: '100%', marginBottom: 6 }}>
              <div
                style={{
                  height: 5,
                  background: 'rgba(0,0,0,0.08)',
                  borderRadius: 100,
                  overflow: 'hidden',
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: canAfford
                      ? 'linear-gradient(90deg, var(--color-gold), var(--color-gold-deep))'
                      : 'linear-gradient(90deg, var(--color-coral), var(--color-gold))',
                    borderRadius: 100,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: 'var(--text-soft)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  letterSpacing: '0.01em',
                }}
              >
                {canAfford ? (
                  <>
                    <span style={{ color: 'var(--color-gold-deep)', fontWeight: 700 }}>Можно купить!</span>
                    <span>{pct}%</span>
                  </>
                ) : (
                  <>
                    <span>ещё {need} PIP</span>
                    <span>{pct}%</span>
                  </>
                )}
              </div>
            </div>

            {/* Price + Buy button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                gap: 6,
              }}
            >
              {/* Price pill */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'var(--color-gold-soft)',
                  borderRadius: 100,
                  padding: '4px 9px 4px 6px',
                  flexShrink: 0,
                }}
              >
                <CoinIcon size={13} />
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 12,
                    color: 'var(--color-gold-deep)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {coinCost}
                </span>
              </div>

              {/* Buy button */}
              <button
                type="button"
                onClick={handleBuy}
                disabled={!canAfford || isPending}
                style={{
                  flex: 1,
                  padding: '7px 6px',
                  background: canAfford
                    ? 'var(--color-coral)'
                    : 'var(--border-default)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  color: canAfford ? 'white' : 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: 12,
                  fontFamily: 'inherit',
                  cursor: canAfford ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {canAfford ? 'Купить' : 'Копи'}
              </button>
            </div>

            {/* Goal button */}
            <button
              type="button"
              onClick={handleGoalToggle}
              disabled={goalPending}
              style={{
                width: '100%',
                marginTop: 6,
                padding: '6px',
                background: isGoal ? 'rgba(91,168,144,0.12)' : 'transparent',
                border: isGoal
                  ? '1px solid var(--color-mint)'
                  : '1px dashed var(--border-default)',
                borderRadius: 'var(--radius-md)',
                color: isGoal ? 'var(--color-mint-deep)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: 11,
                fontFamily: 'inherit',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                transition: 'all 0.15s',
              }}
            >
              {isGoal ? '🎯 Моя цель' : '🎯 Сделать целью'}
            </button>
          </>
        )}
      </div>

      {/* ── Bottom-sheet confirmation ────────────────────────────────── */}
      {state === 'confirm' && (
        <div
          onClick={handleCancel}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 500,
            display: 'flex',
            alignItems: 'flex-end',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              borderRadius: '24px 24px 0 0',
              padding: '8px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              paddingBottom: 'env(safe-area-inset-bottom, 16px)',
            }}
          >
            {/* Handle */}
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'var(--border-default)',
              margin: '0 auto 20px',
            }} />

            {/* Content */}
            <div style={{ padding: '0 20px 20px' }}>
              {/* Icon + title row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 30, flexShrink: 0,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}>
                  {icon}
                </div>
                <div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 18,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.2,
                    marginBottom: 4,
                  }}>
                    {title}
                  </div>
                  {description && (
                    <div style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.4 }}>
                      {description}
                    </div>
                  )}
                </div>
              </div>

              {/* Cost summary */}
              <div style={{
                background: 'var(--color-gold-soft)',
                border: '1px solid var(--color-gold)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 16px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--color-gold-deep)', opacity: 0.75 }}>Спишется</div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700, fontSize: 20,
                    color: 'var(--color-gold-deep)', letterSpacing: '-0.02em',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <CoinIcon size={18} />
                    {coinCost} PIP
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: 'var(--color-gold-deep)', opacity: 0.75 }}>Останется</div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700, fontSize: 20,
                    color: 'var(--color-gold-deep)', letterSpacing: '-0.02em',
                  }}>
                    {balance - coinCost} PIP
                  </div>
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'var(--status-danger-soft)',
                  color: 'var(--status-danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 13, marginBottom: 12,
                }}>
                  {error}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isPending}
                  style={{
                    flex: 1, height: 48,
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-lg)',
                    color: 'var(--text-primary)',
                    fontWeight: 600, fontSize: 15,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  Нет
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isPending}
                  style={{
                    flex: 2, height: 48,
                    background: 'var(--color-coral)',
                    border: 'none',
                    borderRadius: 'var(--radius-lg)',
                    color: 'white',
                    fontWeight: 700, fontSize: 15,
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  {isPending ? 'Заказываем…' : '🎉 Купить!'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
