'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { markTaskComplete } from './actions';
import { TaskIcon, type TaskIconName } from '@/components/ui/TaskIcon';
import { CoinPill } from '@/components/ui/Coin';
import { PhotoUpload } from './PhotoUpload';
import { CelebrationModal, type CelebrationData } from './CelebrationModal';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskRowProps {
  taskId: string;
  childId: string;
  familyId: string;
  childName: string;
  currentStreak: number;
  availableCount: number;   // total available tasks (incl. this one)
  title: string;
  icon: TaskIconName;
  coinValue: number;
  initialStatus: 'available' | 'pending' | 'done';
  requiresApproval: boolean;
  requiresPhoto: boolean;
}

const SWIPE_THRESHOLD = 88;   // px to trigger completion
const SWIPE_MAX      = 110;   // max drag before resistance kicks in

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskRow({
  taskId,
  childId,
  familyId,
  childName,
  currentStreak,
  availableCount,
  title,
  icon,
  coinValue,
  initialStatus,
  requiresApproval,
  requiresPhoto,
}: TaskRowProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Swipe state
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeTriggered, setSwipeTriggered] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef({ startX: 0, startY: 0, active: false, axisLocked: false });

  // ── Non-passive touchmove listener (needed to preventDefault scroll) ──────
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    function onTouchMove(e: TouchEvent) {
      if (!touchRef.current.active) return;

      const dx = e.touches[0].clientX - touchRef.current.startX;
      const dy = e.touches[0].clientY - touchRef.current.startY;

      // Lock axis on first significant movement
      if (!touchRef.current.axisLocked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        touchRef.current.axisLocked = true;
        if (Math.abs(dy) > Math.abs(dx)) {
          // Vertical scroll intent — deactivate swipe
          touchRef.current.active = false;
          setSwipeX(0);
          setIsSwiping(false);
          return;
        }
      }

      if (!touchRef.current.axisLocked) return;

      if (dx > 0) {
        e.preventDefault(); // prevent page scroll during horizontal swipe
        // Apply resistance after threshold
        const raw = dx;
        const clamped = raw <= SWIPE_THRESHOLD
          ? raw
          : SWIPE_THRESHOLD + (raw - SWIPE_THRESHOLD) * 0.25;
        setSwipeX(Math.min(clamped, SWIPE_MAX));
        setIsSwiping(true);
      }
    }

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => el.removeEventListener('touchmove', onTouchMove);
  }, []);

  function handleTouchStart(e: React.TouchEvent) {
    if (status !== 'available' || isPending) return;
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      active: true,
      axisLocked: false,
    };
  }

  function handleTouchEnd() {
    if (!touchRef.current.active) return;
    touchRef.current.active = false;
    touchRef.current.axisLocked = false;

    if (swipeX >= SWIPE_THRESHOLD && !swipeTriggered) {
      setSwipeTriggered(true);
      setSwipeX(0);
      setIsSwiping(false);
      if (requiresPhoto) {
        setShowPhotoModal(true);
      } else {
        submitCompletion(null);
      }
    } else {
      // Spring back
      setSwipeX(0);
      setIsSwiping(false);
    }
  }

  // ── Tap handler ──────────────────────────────────────────────────────────
  function handleClick() {
    if (status !== 'available' || isPending) return;
    if (swipeTriggered) return; // already triggered by swipe
    if (requiresPhoto) {
      // Задание с фото → показываем загрузчик
      setShowPhotoModal(true);
      return;
    }
    // Обычное задание → сразу выполняем, галочка появляется на месте
    submitCompletion(null);
  }

  // ── Core submit ──────────────────────────────────────────────────────────
  function submitCompletion(photoPath: string | null) {
    const optimisticStatus = requiresApproval ? 'pending' : 'done';
    setStatus(optimisticStatus);

    startTransition(async () => {
      const result = await markTaskComplete({ taskId, childId, photoPath });

      if (!result.ok) {
        setStatus('available');
        setSwipeTriggered(false);
        return;
      }

      // Show celebration screen
      setCelebration({
        childName,
        taskTitle: title,
        awarded: result.awarded,
        requiresApproval: result.status === 'pending',
        currentStreak,
        availableLeft: Math.max(0, availableCount - 1),
      });

      router.refresh();
    });
  }

  function handlePhotoUploaded(photoPath: string) {
    setShowPhotoModal(false);
    submitCompletion(photoPath);
  }

  function handleCelebrationClose() {
    setCelebration(null);
  }

  // ── Derived display state ────────────────────────────────────────────────
  const isDone          = status === 'done';
  const isPendingApproval = status === 'pending';
  const isInactive      = isDone || isPendingApproval;

  // Swipe progress (0–1) for visual indicators
  const swipeProgress = Math.min(swipeX / SWIPE_THRESHOLD, 1);
  const showSwipeHint = swipeProgress > 0.05;

  return (
    <>
      {/* Swipe wrapper */}
      <div
        ref={rowRef}
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Green background revealed by swipe */}
        {!isInactive && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(90deg, var(--color-mint-soft), var(--color-mint))`,
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: 20,
              opacity: swipeProgress,
              transition: isSwiping ? 'none' : 'opacity 0.2s ease',
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--color-mint)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${0.5 + swipeProgress * 0.5})`,
              transition: isSwiping ? 'none' : 'transform 0.2s ease',
              boxShadow: '0 2px 12px rgba(72, 199, 142, 0.4)',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {swipeProgress > 0.5 && (
              <span style={{
                marginLeft: 10,
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-mint-deep)',
                opacity: (swipeProgress - 0.5) * 2,
              }}>
                {swipeProgress >= 1 ? 'Готово!' : 'Проведи ещё'}
              </span>
            )}
          </div>
        )}

        {/* Main task card — shifts right on swipe */}
        <button
          type="button"
          onClick={handleClick}
          disabled={isInactive || isPending}
          style={{
            width: '100%',
            background: isDone
              ? 'var(--color-mint-soft)'
              : isPendingApproval
                ? 'var(--bg-surface-2)'
                : 'var(--bg-surface)',
            border: `1px solid ${isDone ? 'var(--color-mint)' : 'var(--border-soft)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: isInactive ? 'default' : 'pointer',
            opacity: isInactive ? 0.7 : 1,
            textAlign: 'left',
            fontFamily: 'inherit',
            position: 'relative',
            transform: `translateX(${swipeX}px)`,
            transition: isSwiping
              ? 'none'
              : 'transform 0.35s cubic-bezier(0.22,1,0.36,1), background 0.15s, opacity 0.15s',
            willChange: isSwiping ? 'transform' : 'auto',
          }}
        >
          <TaskIcon name={icon} size={40} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 600,
              fontSize: 14,
              color: 'var(--text-primary)',
              textDecoration: isDone ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {title}
            </div>
            <div style={{
              fontSize: 11.5,
              color: isPendingApproval ? 'var(--color-gold-deep)' : 'var(--text-soft)',
              marginTop: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}>
              {isDone ? (
                '✓ выполнено'
              ) : isPendingApproval ? (
                'ждёт подтверждения'
              ) : (
                <>
                  {requiresPhoto && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      strokeLinejoin="round" aria-label="Требуется фото">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M7 5l2-2h6l2 2" />
                    </svg>
                  )}
                  {coinValue} pip
                </>
              )}
            </div>
          </div>

          {/* Right side: coin, check, or pending dot */}
          {isDone ? (
            <div style={checkmarkStyle}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ) : isPendingApproval ? (
            <div style={pendingDotStyle} aria-label="Ждёт подтверждения" />
          ) : (
            <CoinPill amount={coinValue} />
          )}

          {/* Swipe arrow hint (shown when task is available and not being swiped yet) */}
          {!isInactive && !isSwiping && swipeX === 0 && (
            <div style={{
              position: 'absolute',
              right: -4,
              top: '50%',
              transform: 'translateY(-50%)',
              opacity: 0.2,
              fontSize: 10,
              color: 'var(--text-soft)',
              pointerEvents: 'none',
            }}>
              ›
            </div>
          )}
        </button>
      </div>

      {/* Photo upload modal */}
      {showPhotoModal && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'auto' }}
        >
          <PhotoUpload
            familyId={familyId}
            onUploaded={handlePhotoUploaded}
            onCancel={() => { setShowPhotoModal(false); setSwipeTriggered(false); }}
          />
        </div>
      )}

      {/* Celebration modal */}
      {celebration && (
        <CelebrationModal data={celebration} onClose={handleCelebrationClose} />
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const checkmarkStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 100,
  background: 'var(--color-mint)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const pendingDotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 100,
  background: 'var(--color-gold)',
  boxShadow: '0 0 0 4px var(--color-gold-soft)',
  flexShrink: 0,
};
