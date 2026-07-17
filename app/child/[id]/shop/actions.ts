'use server';

import { revalidatePath } from 'next/cache';
import { resolveChildAuth } from '@/lib/childAuth';
import { sendPushToProfile } from '@/lib/webpush';
import { friendlyDbError } from '@/lib/friendlyError';
import type { Result } from '@/lib/result';


/**
 * Ребёнок заказывает награду.
 *
 * SQL-функция order_reward_atomic атомарно проверяет:
 *   • награда не архивирована и доступна этому ребёнку
 *   • у ребёнка хватает монет
 *   • лимит "once" не нарушен
 *   • списывает монеты через транзакцию с блокировкой профиля
 */
export async function orderReward(input: {
  rewardId: string;
  childId: string;
}): Promise<Result<{ orderId: string; cost: number; balance: number }>> {
  const auth = await resolveChildAuth(input.childId);
  if (!auth.ok) return auth;
  const { adminDb, familyId } = auth;

  // Награда должна быть из той же семьи — иначе можно заказать чужую награду.
  const { data: reward } = await adminDb
    .from('rewards')
    .select('family_id, title')
    .eq('id', input.rewardId)
    .single();
  if (!reward || reward.family_id !== familyId) {
    return { ok: false, error: 'Награда не найдена' };
  }

  const { data, error } = await adminDb.rpc('order_reward_atomic', {
    p_reward_id: input.rewardId,
    p_profile_id: input.childId,
  });

  if (error) {
    console.error('[orderReward]', error);
    return { ok: false, error: friendlyDbError(error.message, 'Не получилось заказать') };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'Пустой ответ от БД' };

  revalidatePath(`/child/${input.childId}`);
  revalidatePath(`/child/${input.childId}/shop`);

  // Push родителям
  const { data: childProfile } = await adminDb
    .from('profiles')
    .select('name')
    .eq('id', input.childId)
    .single();

  const { data: parents } = await adminDb
    .from('profiles')
    .select('id')
    .eq('family_id', familyId)
    .eq('role', 'parent');

  for (const parent of parents ?? []) {
    void sendPushToProfile(parent.id, {
      title: '🛍 Новый заказ награды',
      body: `${childProfile?.name ?? 'Ребёнок'} заказал(а) награду`,
      url: '/parent/orders',
    });
  }

  return {
    ok: true,
    orderId: row.order_id,
    cost: row.cost ?? 0,
    balance: row.new_balance ?? 0,
  };
}
