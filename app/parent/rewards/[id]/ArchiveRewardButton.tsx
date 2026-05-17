'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { archiveReward, unarchiveReward } from '../actions';
import { Button } from '@/components/ui/Button';

export function ArchiveRewardButton({
  rewardId,
  archived,
}: {
  rewardId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (archived) {
      // unarchive — без подтверждения
      startTransition(async () => {
        const result = await unarchiveReward(rewardId);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.refresh();
      });
      return;
    }

    if (!confirming) {
      setConfirming(true);
      return;
    }

    startTransition(async () => {
      const result = await archiveReward(rewardId);
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.push('/parent/rewards');
      router.refresh();
    });
  }

  return (
    <>
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

      {archived ? (
        <Button variant="ink" size="md" fullWidth onClick={handleClick} disabled={isPending}>
          {isPending ? 'Восстанавливаем…' : 'Восстановить'}
        </Button>
      ) : confirming ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="ghost"
            size="md"
            fullWidth
            onClick={() => setConfirming(false)}
            disabled={isPending}
          >
            Отмена
          </Button>
          <Button variant="danger" size="md" fullWidth onClick={handleClick} disabled={isPending}>
            {isPending ? 'Архивируем…' : 'Да, в архив'}
          </Button>
        </div>
      ) : (
        <Button variant="ghost" size="md" fullWidth onClick={handleClick} disabled={isPending}>
          В архив
        </Button>
      )}
    </>
  );
}
