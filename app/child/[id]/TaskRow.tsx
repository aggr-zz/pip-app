'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { markTaskComplete } from './actions';
import { TaskIcon, type TaskIconName } from '@/components/ui/TaskIcon';
import { PhotoUpload } from './PhotoUpload';
import { CelebrationModal, type CelebrationData } from './CelebrationModal';
import { AchievementCelebrationModal } from './AchievementCelebrationModal';
import type { AchievementType } from '@/lib/achievements';

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
  const [achievementQueue, setAchievementQueue] = useState<AchievementType[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
        setErrorMsg(result.error);
        setTimeout(() => setErrorMsg(null), 5000);
        return;
      }

      // Queue any newly unlocked achievements (shown after task celebration)
      if (result.newlyUnlocked?.length) {
        setAchievementQueue(result.newlyUnlocked as AchievementType[]);
      }

      // Show task celebration screen
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
    // Achievement queue will show after task celebration closes
    // (rendered below — first item in queue shows automatically)
  }

  function handleAchievementClose() {
    // Pop the first achievement from the queue
    setAchievementQueue((q) => q.slice(1));
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
      {/* Row wrapper — swipe supported on mobile */}
      <div
        ref={rowRef}
        style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {/* Swipe reveal — green stripe behind the row */}
        {!isInactive && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(90deg, var(--color-mint-soft), var(--color-mint))',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingLeft: 16,
              opacity: swipeProgress,
              transition: isSwiping ? 'none' : 'opacity 0.2s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="var(--color-mint-deep)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
              style={{ opacity: swipeProgress }}>
              <path d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* ── Task row ──────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleClick}
          disabled={isInactive || isPending}
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-lg)',
            padding: '13px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: isInactive ? 'default' : 'pointer',
            textAlign: 'left',
            fontFamily: 'inherit',
            position: 'relative',
            transform: `translateX(${swipeX}px)`,
            transition: isSwiping
              ? 'none'
              : 'transform 0.35s cubic-bezier(0.22,1,0.36,1)',
            willChange: isSwiping ? 'transform' : 'auto',
          }}
        >
          {/* ── Checkbox ── */}
          <div
            aria-hidden
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.18s, border-color 0.18s, transform 0.18s',
              ...(isDone ? {
                background: 'var(--color-mint)',
                border: '2px solid var(--color-mint)',
                transform: 'scale(1)',
              } : isPendingApproval ? {
                background: 'var(--color-gold-soft)',
                border: '2px solid var(--color-gold)',
              } : {
                background: 'transparent',
                border: '2px solid var(--border-default)',
              }),
            }}
          >
            {isDone && (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
            {isPendingApproval && (
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--color-gold)',
              }} />
            )}
          </div>

          {/* ── Title + meta ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontWeight: 500,
              fontSize: 15,
              color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: isDone ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.3,
            }}>
              {title}
            </div>
            {!isDone && (
              <div style={{
                fontSize: 11.5,
                color: isPendingApproval ? 'var(--color-gold-deep)' : 'var(--text-soft)',
                marginTop: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}>
                {isPendingApproval ? (
                  'ждёт подтверждения'
                ) : (
                  <>
                    {requiresPhoto && (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <circle cx="12" cy="12" r="3" />
                        <path d="M7 5l2-2h6l2 2" />
                      </svg>
                    )}
                    {coinValue} PIP
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Right: icon (always shown) ── */}
          <TaskIcon name={icon} size={44} colored={false} />
        </button>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div style={{
          marginTop: 6,
          padding: '8px 12px',
          background: 'var(--status-danger-soft)',
          color: 'var(--status-danger)',
          borderRadius: 'var(--radius-md)',
          fontSize: 12.5,
          lineHeight: 1.4,
        }}>
          ⚠️ {errorMsg}
        </div>
      )}

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

      {/* Task celebration modal */}
      {celebration && (
        <CelebrationModal data={celebration} onClose={handleCelebrationClose} />
      )}

      {/* Achievement celebration modal — shown after task celebration, one at a time */}
      {!celebration && achievementQueue.length > 0 && (
        <AchievementCelebrationModal
          key={achievementQueue[0]}
          type={achievementQueue[0]}
          childName={childName}
          onClose={handleAchievementClose}
        />
      )}
    </>
  );
}

