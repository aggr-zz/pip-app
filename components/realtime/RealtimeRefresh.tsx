'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Подписывается на изменения в указанных таблицах через Supabase Realtime.
 * На любое изменение вызывает router.refresh() — Next.js перерендерит
 * server components с новыми данными, не дёргая полностью страницу.
 *
 * Использование:
 *   <RealtimeRefresh tables={['task_completions', 'reward_orders']} />
 *
 * RLS работает: подписка увидит только изменения, разрешённые политиками,
 * так что родитель получит только события своей семьи.
 */
export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('pip-realtime-' + Math.random().toString(36).slice(2));

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    function scheduleRefresh() {
      // Дебаунс: если приходит несколько событий подряд, ждём 300 мс и делаем
      // одну обновляющую перерисовку. Иначе при массовом auto-approve можем
      // зафлудить refresh-ами.
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        router.refresh();
      }, 300);
    }

    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        scheduleRefresh,
      );
    }

    channel.subscribe();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(',')]);

  return null;
}
