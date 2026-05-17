'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { todayInTimezone } from '@/lib/schedule';

type Result<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

const ACTIVE_CHILD_COOKIE = 'pip_active_child';

/**
 * Ребёнок отмечает задачу выполненной.
 *
 * Вся логика — в SQL-функции complete_task_atomic:
 *   - вставляет task_completion (pending или auto_approved)
 *   - если не требует подтверждения → начисляет монеты
 *   - всё в одной транзакции с блокировкой профиля
 *
 * Безопасность:
 *   - Проверяем что пользователь авторизован (родитель)
 *   - childId в URL должен совпадать с cookie pip_active_child
 *     (родитель «зашёл» в этот режим по PIN)
 *   - Сама функция в БД ещё раз проверит family_id и assigned_to
 */
export async function markTaskComplete(input: {
  taskId: string;
  childId: string;
  photoPath?: string | null;
}): Promise<Result<{ status: string; awarded: number; balance: number }>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  // Проверка cookie активного режима ребёнка
  const cookieStore = await cookies();
  const activeChildId = cookieStore.get(ACTIVE_CHILD_COOKIE)?.value;
  if (!activeChildId || activeChildId !== input.childId) {
    return { ok: false, error: 'Сначала зайди в режим ребёнка по PIN' };
  }

  // Получаем timezone семьи для правильного определения «сегодня»
  const { data: me } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('user_id', user.id)
    .single();

  if (!me) return { ok: false, error: 'Профиль не найден' };

  const { data: family } = await supabase
    .from('families')
    .select('timezone')
    .eq('id', me.family_id)
    .single();

  const tz = family?.timezone || 'Europe/Moscow';
  const today = todayInTimezone(tz);

  // Идемпотентность: если этот же ребёнок повторно жмёт «готово» — не падаем,
  // просто возвращаем существующее completion
  const idempotencyKey = `${input.taskId}:${input.childId}:${today}`;

  const { data, error } = await supabase.rpc('complete_task_atomic', {
    p_task_id: input.taskId,
    p_profile_id: input.childId,
    p_scheduled_for: today,
    p_idempotency_key: idempotencyKey,
    p_photo_path: input.photoPath ?? null,
  });

  if (error) {
    console.error('[markTaskComplete]', error);
    // Если completion не создалось, но фото уже загружено — оно останется как orphan.
    // Это OK для MVP, periodic cleanup можно сделать позже.
    return { ok: false, error: error.message || 'Не получилось отметить' };
  }

  // RPC возвращает массив рядов
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'Пустой ответ от БД' };

  // Проверяем достижения (не критично, ошибки молча игнорируем)
  try {
    await supabase.rpc('check_achievements', { p_profile_id: input.childId });
  } catch (e) {
    console.warn('[markTaskComplete] check_achievements failed:', e);
  }

  revalidatePath(`/child/${input.childId}`);
  revalidatePath(`/child/${input.childId}/achievements`);

  return {
    ok: true,
    status: row.status,
    awarded: row.awarded ?? 0,
    balance: row.new_balance ?? 0,
  };
}
