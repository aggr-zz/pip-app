'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markTaskComplete } from './actions';
import { TaskIcon, type TaskIconName } from '@/components/ui/TaskIcon';
import { CoinPill } from '@/components/ui/Coin';
import { PhotoUpload } from './PhotoUpload';

interface TaskRowProps {
  taskId: string;
  childId: string;
  familyId: string;
  title: string;
  icon: TaskIconName;
  coinValue: number;
  initialStatus: 'available' | 'pending' | 'done';
  requiresApproval: boolean;
  requiresPhoto: boolean;
}

/**
 * Строка задачи в детском интерфейсе. Три состояния:
 *   - available — можно нажать «готово»
 *   - pending   — отметили, ждёт подтверждения родителем
 *   - done      — задача выполнена (auto_approved или approved)
 *
 * Если requiresPhoto = true, при клике сначала открывается фото-модалка.
 */
export function TaskRow({
  taskId,
  childId,
  familyId,
  title,
  icon,
  coinValue,
  initialStatus,
  requiresApproval,
  requiresPhoto,
}: TaskRowProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [justEarned, setJustEarned] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (status !== 'available' || isPending) return;
    setError(null);

    // Если задача требует фото — открываем модалку, completion создастся после загрузки
    if (requiresPhoto) {
      setShowPhotoModal(true);
      return;
    }

    // Иначе сразу пишем completion
    submitCompletion(null);
  }

  function submitCompletion(photoPath: string | null) {
    // Оптимистично переключаем UI
    const optimisticStatus = requiresApproval ? 'pending' : 'done';
    setStatus(optimisticStatus);

    startTransition(async () => {
      const result = await markTaskComplete({ taskId, childId, photoPath });

      if (!result.ok) {
        // Откатываем
        setStatus('available');
        setError(result.error);
        return;
      }

      // Если auto_approved — показываем «+N pip» на секунду
      if (result.status === 'auto_approved' && result.awarded > 0) {
        setJustEarned(result.awarded);
        setTimeout(() => setJustEarned(null), 2200);
      }

      router.refresh(); // обновить баланс в шапке
    });
  }

  function handlePhotoUploaded(photoPath: string) {
    setShowPhotoModal(false);
    submitCompletion(photoPath);
  }


  const isDone = status === 'done';
  const isPendingApproval = status === 'pending';
  const isInactive = isDone || isPendingApproval;

  return (
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
        border: `1px solid ${
          isDone ? 'var(--color-mint)' : 'var(--border-soft)'
        }`,
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
        transition: 'background 0.15s, opacity 0.15s',
      }}
    >
      <TaskIcon name={icon} size={40} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--text-primary)',
            textDecoration: isDone ? 'line-through' : 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: isPendingApproval ? 'var(--color-gold-deep)' : 'var(--text-soft)',
            marginTop: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          {isDone ? (
            '✓ выполнено'
          ) : isPendingApproval ? (
            'ждёт подтверждения'
          ) : (
            <>
              {requiresPhoto && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Требуется фото">
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

      {/* Правая часть: монеты, чекмарк или индикатор ожидания */}
      {isDone ? (
        <div style={checkmarkStyle}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
      ) : isPendingApproval ? (
        <div style={pendingDotStyle} aria-label="Ждёт подтверждения" />
      ) : (
        <CoinPill amount={coinValue} />
      )}

      {/* +N pip всплывает после авто-аппрува */}
      {justEarned !== null && (
        <div style={floatingCoinsStyle} aria-live="polite">
          +{justEarned} pip 🪙
        </div>
      )}

      {error && (
        <div role="alert" style={errorTooltipStyle}>
          {error}
        </div>
      )}

      {/* Фото-модалка для задач с requires_photo */}
      {showPhotoModal && (
        <PhotoUploadWrapper
          familyId={familyId}
          onUploaded={handlePhotoUploaded}
          onCancel={() => setShowPhotoModal(false)}
        />
      )}
    </button>
  );
}

/**
 * Обёртка чтобы модалка рендерилась поверх кнопки и не получала её клики.
 * Использует портал-like подход (хотя в Next.js client component'е это работает иначе),
 * но фиксированное позиционирование с z-index достаточно.
 */
function PhotoUploadWrapper(props: React.ComponentProps<typeof PhotoUpload>) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{ position: 'fixed', inset: 0, zIndex: 100, pointerEvents: 'auto' }}
    >
      <PhotoUpload {...props} />
    </div>
  );
}

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

const floatingCoinsStyle: React.CSSProperties = {
  position: 'absolute',
  top: -28,
  right: 16,
  background: 'var(--color-gold)',
  color: 'var(--color-ink)',
  padding: '4px 10px',
  borderRadius: 'var(--radius-pill)',
  fontSize: 13,
  fontWeight: 700,
  pointerEvents: 'none',
  animation: 'pip-float-up 2s ease-out forwards',
  boxShadow: '0 4px 12px rgba(212, 161, 46, 0.4)',
};

const errorTooltipStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 6,
  background: 'var(--status-danger-soft)',
  color: 'var(--status-danger)',
  padding: '6px 12px',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  zIndex: 5,
};
