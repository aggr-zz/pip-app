'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyChildSession } from '@/lib/childSession';
import { sendPushToProfile } from '@/lib/webpush';

const ACTIVE_CHILD_COOKIE = 'pip_active_child';

type Result<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/**
 * Авторизация ребёнка — два режима (как в markTaskComplete/goalActions.resolveAuth).
 * Возвращает admin-клиент (обходит RLS) и familyId.
 *
 * Режим 1: прямая детская сессия (вход по PIN/QR → cookie pip_child_direct).
 * Режим 2: родитель «зашёл» в режим ребёнка (Supabase-сессия + cookie pip_active_child).
 *
 * Раньше orderReward поддерживал ТОЛЬКО режим 2 → ребёнок, вошедший по PIN
 * (заявленный главный сценарий), не мог заказать ни одной награды.
 */
async function resolveChildAuth(childId: string): Promise<
  | { ok: true; adminDb: ReturnType<typeof createAdminClient>; familyId: string }
  | { ok: false; error: string }
> {
  const cookieStore = await cookies();
  const adminDb = createAdminClient();

  // Режим 1: pip_child_direct (только если токен ВАЛИДНЫЙ; устаревший/чужой cookie
  // не должен блокировать родителя в режиме ребёнка — падаем в режим 2).
  const directToken = cookieStore.get('pip_child_direct')?.value;
  const directSession = directToken ? verifyChildSession(directToken) : null;
  if (directSession && directSession.childId === childId) {
    return { ok: true, adminDb, familyId: directSession.familyId };
  }

  // Режим 2: родитель + pip_active_child
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const activeChild = cookieStore.get(ACTIVE_CHILD_COOKIE)?.value;
  if (!activeChild || activeChild !== childId) {
    return { ok: false, error: 'Сначала зайди в режим ребёнка по PIN' };
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('user_id', user.id)
    .single();
  if (!me?.family_id) return { ok: false, error: 'Профиль родителя не найден' };

  const { data: child } = await adminDb
    .from('profiles')
    .select('family_id, role')
    .eq('id', childId)
    .single();
  if (child?.role !== 'child' || child.family_id !== me.family_id) {
    return { ok: false, error: 'Ребёнок не из вашей семьи' };
  }

  return { ok: true, adminDb, familyId: me.family_id };
}

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
    return { ok: false, error: error.message || 'Не получилось заказать' };
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
