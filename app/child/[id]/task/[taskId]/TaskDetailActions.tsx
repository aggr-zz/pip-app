'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { markTaskComplete } from '../../actions';
import { PhotoUpload } from '../../PhotoUpload';
import { CelebrationModal, type CelebrationData } from '../../CelebrationModal';

interface TaskDetailActionsProps {
  taskId: string;
  childId: string;
  familyId: string;
  childName: string;
  taskTitle: string;
  coinValue: number;
  requiresApproval: boolean;
  requiresPhoto: boolean;
  currentStreak: number;
}

export function TaskDetailActions({
  taskId,
  childId,
  familyId,
  childName,
  taskTitle,
  coinValue,
  requiresApproval,
  requiresPhoto,
  currentStreak,
}: TaskDetailActionsProps) {
  const router = useRouter();
  const [showPhoto, setShowPhoto] = useState(false);
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDone() {
    if (requiresPhoto) {
      setShowPhoto(true);
    } else {
      submit(null);
    }
  }

  function submit(photoPath: string | null) {
    setError(null);
    startTransition(async () => {
      const result = await markTaskComplete({ taskId, childId, photoPath });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCelebration({
        childName,
        taskTitle,
        awarded: result.awarded,
        requiresApproval: result.status === 'pending',
        currentStreak: result.newStreak ?? currentStreak,
        availableLeft: 0,
      });
      router.refresh();
    });
  }

  if (celebration) {
    return (
      <CelebrationModal
        data={celebration}
        onClose={() => router.push(`/child/${childId}`)}
      />
    );
  }

  return (
    <>
      {/* Подсказка про фото */}
      {requiresPhoto && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', borderRadius: 'var(--radius-xl)',
          background: 'var(--color-mint-soft)',
          border: '1px solid var(--color-mint)',
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>📷</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-mint-deep)', marginBottom: 2 }}>
              Нужно фото
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-mint-deep)', opacity: 0.85, lineHeight: 1.4 }}>
              Сделай фото выполненного задания — родитель увидит и подтвердит
            </div>
          </div>
        </div>
      )}

      {/* Подсказка про подтверждение (без фото) */}
      {requiresApproval && !requiresPhoto && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 12,
          padding: '14px 16px', borderRadius: 'var(--radius-xl)',
          background: 'var(--color-gold-soft)',
          border: '1px solid var(--color-gold)',
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>✅</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-gold-deep)', marginBottom: 2 }}>
              Нужно подтверждение
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-gold-deep)', opacity: 0.85, lineHeight: 1.4 }}>
              После нажатия родитель одобрит и монеты зачислятся
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-md)',
          background: 'var(--status-danger-soft)', color: 'var(--status-danger)',
          fontSize: 13.5, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Большая кнопка выполнения */}
      <button
        onClick={handleDone}
        disabled={isPending}
        style={{
          width: '100%', padding: '18px',
          borderRadius: 'var(--radius-xl)', border: 'none',
          background: isPending
            ? 'var(--border-default)'
            : 'linear-gradient(135deg, var(--color-mint), #3DAB77)',
          color: 'white', fontFamily: 'var(--font-display)',
          fontWeight: 700, fontSize: 18,
          cursor: isPending ? 'wait' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: isPending ? 'none' : '0 4px 20px rgba(72, 199, 142, 0.35)',
          transition: 'all 0.2s',
          letterSpacing: '-0.01em',
        }}
      >
        {isPending ? (
          'Отмечаем…'
        ) : (
          <>
            <span style={{ fontSize: 22 }}>{requiresPhoto ? '📷' : '✓'}</span>
            {requiresPhoto ? 'Сделать фото' : 'Выполнено!'}
          </>
        )}
      </button>

      {/* Фото-модал */}
      {showPhoto && (
        <PhotoUpload
          childId={childId}
          familyId={familyId}
          onUploaded={(path) => { setShowPhoto(false); submit(path); }}
          onCancel={() => setShowPhoto(false)}
        />
      )}
    </>
  );
}
