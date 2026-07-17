'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { friendlyDbError } from '@/lib/friendlyError';
import type { Result } from '@/lib/result';


/**
 * Ручная корректировка баланса ребёнка родителем.
 *
 * Примеры использования:
 *   +50 «помощь бабушке» — бонус за то, что выходит за рамки задач
 *   -30 «нагрубил» — штраф за плохое поведение
 *   +100 «ошибся в задаче, не доплатил» — исправление
 *
 * Лимит ±500 pip за одну операцию (для подстраховки от опечатки на нолях).
 * Баланс не может уйти в минус.
 */
export async function adjustBalance(input: {
  profileId: string;
  amount: number;
  reason: string;
}): Promise<Result<{ newBalance: number }>> {
  // Дублирующая клиентская валидация
  if (!Number.isInteger(input.amount) || input.amount === 0) {
    return { ok: false, error: 'Сумма должна быть целым числом и не нулём' };
  }
  if (Math.abs(input.amount) > 500) {
    return { ok: false, error: 'Лимит ±500 pip за операцию' };
  }
  const reason = (input.reason ?? '').trim();
  if (!reason) {
    return { ok: false, error: 'Укажи причину — ребёнок увидит её в истории' };
  }
  if (reason.length > 200) {
    return { ok: false, error: 'Причина слишком длинная (макс 200)' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data, error } = await supabase.rpc('manual_adjust_balance', {
    p_profile_id: input.profileId,
    p_amount: input.amount,
    p_reason: reason,
  });

  if (error) {
    console.error('[adjustBalance]', error);
    return { ok: false, error: friendlyDbError(error.message, 'Не получилось скорректировать') };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'Пустой ответ от БД' };

  revalidatePath(`/parent/children/${input.profileId}`);
  revalidatePath(`/parent/children/${input.profileId}/adjust`);
  revalidatePath(`/child/${input.profileId}`);
  revalidatePath(`/child/${input.profileId}/history`);

  return { ok: true, newBalance: row.new_balance };
}
