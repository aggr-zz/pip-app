'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { todayInTimezone } from '@/lib/schedule';
import { verifyChildSession } from '@/lib/childSession';

type Result<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export type MarkTaskCompleteResult = Result<{
  status: string;
  awarded: number;
  balance: number;
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
  const cookieStore = await cookies();

  // ── Auth mode 1: parent session + pip_active_child cookie ────────────────
  // ── Auth mode 2: direct child session via pip_child_direct cookie ────────
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let familyId: string;

  // Прямая детская сессия — только если токен ВАЛИДНЫЙ. Если cookie нет или он
  // устарел/невалиден (напр. подписан старым секретом) — не падаем, а переходим
  // к родительскому режиму, иначе залогиненный родитель не сможет отметить задачу.
  const directToken = cookieStore.get('pip_child_direct')?.value;
  const directSession = directToken ? verifyChildSession(directToken) : null;
  if (directSession && directSession.childId === input.childId) {
    // Use admin client (bypasses RLS for direct child sessions)
    supabase = createAdminClient() as unknown as Awaited<ReturnType<typeof createClient>>;
    familyId = directSession.familyId;
  } else {
    // Mode 1: parent Supabase session
    supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Не авторизован' };

    const activeChildId = cookieStore.get(ACTIVE_CHILD_COOKIE)?.value;
    if (!activeChildId || activeChildId !== input.childId) {
      return { ok: false, error: 'Сначала зайди в режим ребёнка по PIN' };
    }

    const { data: me } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('user_id', user.id)
      .single();
    if (!me) return { ok: false, error: 'Профиль не найден' };
    familyId = me.family_id;
  }

  // Verify child belongs to the resolved family
  {
    const { data: childProfile } = await (supabase as ReturnType<typeof createAdminClient>)
      .from('profiles')
      .select('family_id')
      .eq('id', input.childId)
      .single();
    if (!childProfile || childProfile.family_id !== familyId) {
      return { ok: false, error: 'Доступ запрещён' };
    }
  }

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

  revalidatePath(`/child/${input.childId}`);
  revalidatePath(`/child/${input.childId}/achievements`);

  return {
    ok: true,
    status: row.status,
    awarded: row.awarded ?? 0,
    balance: row.new_balance ?? 0,
    newlyUnlocked,
  };
}
