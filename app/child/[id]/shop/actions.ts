'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const ACTIVE_CHILD_COOKIE = 'pip_active_child';

type Result<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/**
 * Ребёнок заказывает награду.
 *
 * Безопасность:
 *   - Должна быть активная сессия родителя
 *   - childId из URL должен совпадать с cookie pip_active_child
 *     (родитель «зашёл» в этот режим по PIN)
 *   - SQL-функция атомарно проверяет:
 *     • награда не архивирована
 *     • награда доступна этому ребёнку
 *     • у ребёнка хватает монет
 *     • лимит "once" не нарушен
 *     • списывает монеты через транзакцию
 */
export async function orderReward(input: {
  rewardId: string;
  childId: string;
}): Promise<Result<{ orderId: string; cost: number; balance: number }>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const cookieStore = await cookies();
  const activeChildId = cookieStore.get(ACTIVE_CHILD_COOKIE)?.value;
  if (!activeChildId || activeChildId !== input.childId) {
    return { ok: false, error: 'Сначала зайди в режим ребёнка по PIN' };
  }

  const { data, error } = await supabase.rpc('order_reward_atomic', {
    p_reward_id: input.rewardId,
    p_profile_id: input.childId,
  });

  if (error) {
    console.error('[orderReward]', error);
    return { ok: false, error: error.message || 'Не получилось заказать' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'Пустой ответ от БД' };

  revalidatePath(`/child/${input.childId}`);
  revalidatePath(`/child/${input.childId}/shop`);

  return {
    ok: true,
    orderId: row.order_id,
    cost: row.cost ?? 0,
    balance: row.new_balance ?? 0,
  };
}
