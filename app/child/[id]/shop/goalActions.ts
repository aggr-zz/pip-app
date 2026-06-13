'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyChildSession } from '@/lib/childSession';

type Result = { ok: true } | { ok: false; error: string };

/** Авторизация — два режима (аналог markTaskComplete). Возвращает и familyId. */
async function resolveAuth(childId: string): Promise<
  { ok: true; adminDb: ReturnType<typeof createAdminClient>; familyId: string } | { ok: false; error: string }
> {
  const cookieStore = await cookies();
  const adminDb = createAdminClient();

  // Режим 1: pip_child_direct
  const directToken = cookieStore.get('pip_child_direct')?.value;
  if (directToken) {
    const session = verifyChildSession(directToken);
    if (!session || session.childId !== childId) {
      return { ok: false, error: 'Сессия ребёнка недействительна' };
    }
    return { ok: true, adminDb, familyId: session.familyId };
  }

  // Режим 2: родитель + pip_active_child
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const activeChild = cookieStore.get('pip_active_child')?.value;
  if (!activeChild || activeChild !== childId) {
    return { ok: false, error: 'Сначала зайди в режим ребёнка по PIN' };
  }

  // Семья родителя + проверка, что ребёнок из этой же семьи (а не из чужой).
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

/** Установить / сменить цель-копилку */
export async function setGoal(input: {
  childId: string;
  rewardId: string;
}): Promise<Result> {
  const auth = await resolveAuth(input.childId);
  if (!auth.ok) return auth;

  // Награда должна быть из той же семьи — иначе можно записать в цель чужую награду.
  const { data: reward } = await auth.adminDb
    .from('rewards')
    .select('family_id')
    .eq('id', input.rewardId)
    .single();
  if (!reward || reward.family_id !== auth.familyId) {
    return { ok: false, error: 'Награда не найдена' };
  }

  const { error } = await auth.adminDb
    .from('reward_goals')
    .upsert(
      { child_id: input.childId, reward_id: input.rewardId },
      { onConflict: 'child_id' }
    );

  if (error) {
    console.error('[setGoal]', error);
    return { ok: false, error: 'Не удалось сохранить цель' };
  }

  revalidatePath(`/child/${input.childId}`);
  revalidatePath(`/child/${input.childId}/shop`);
  return { ok: true };
}

/** Убрать цель */
export async function clearGoal(input: { childId: string }): Promise<Result> {
  const auth = await resolveAuth(input.childId);
  if (!auth.ok) return auth;

  const { error } = await auth.adminDb
    .from('reward_goals')
    .delete()
    .eq('child_id', input.childId);

  if (error) {
    console.error('[clearGoal]', error);
    return { ok: false, error: 'Не удалось убрать цель' };
  }

  revalidatePath(`/child/${input.childId}`);
  revalidatePath(`/child/${input.childId}/shop`);
  return { ok: true };
}
