'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { todayInTimezone } from '@/lib/schedule';
import { resolveChildAuth } from '@/lib/childAuth';
import type { Result } from '@/lib/result';


export type MarkTaskCompleteResult = Result<{
  status: string;
  awarded: number;
  balance: number;
  /** Актуальный стрик ПОСЛЕ выполнения (для корректной модалки-празднования) */
  newStreak: number;
  /** Типы достижений, разблокированных прямо сейчас */
  newlyUnlocked: string[];
}>;

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
}): Promise<MarkTaskCompleteResult> {
  // Единая авторизация (lib/childAuth): проверяет и подпись токена, и живой ли
  // профиль в БД (не архивирован, role='child', та же семья). Раньше этот блок
  // был скопирован здесь и ещё в 3 файлах, и все копии верили токену без сверки.
  const auth = await resolveChildAuth(input.childId);
  if (!auth.ok) return { ok: false, error: auth.error };
  const supabase = auth.adminDb;
  const familyId = auth.familyId;

  const { data: family } = await (supabase as ReturnType<typeof createAdminClient>)
    .from('families')
    .select('timezone')
    .eq('id', familyId)
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

  // Проверяем достижения — возвращаем только что разблокированные
  let newlyUnlocked: string[] = [];
  try {
    const { data: achData } = await supabase.rpc('check_achievements', {
      p_profile_id: input.childId,
    });
    // RPC returns array of rows; each row has newly_unlocked (text[])
    newlyUnlocked = achData?.[0]?.newly_unlocked ?? [];
  } catch (e) {
    console.warn('[markTaskComplete] check_achievements failed:', e);
  }

  // Актуальный стрик после RPC (для модалки-празднования). complete_task_atomic
  // уже обновил current_streak при auto-approve; для pending он не меняется.
  let newStreak = 0;
  {
    const { data: prof } = await (supabase as ReturnType<typeof createAdminClient>)
      .from('profiles')
      .select('current_streak')
      .eq('id', input.childId)
      .single();
    newStreak = prof?.current_streak ?? 0;
  }

  revalidatePath(`/child/${input.childId}`);
  revalidatePath(`/child/${input.childId}/achievements`);

  return {
    ok: true,
    status: row.status,
    awarded: row.awarded ?? 0,
    balance: row.new_balance ?? 0,
    newStreak,
    newlyUnlocked,
  };
}
