'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyChildSession } from '@/lib/childSession';

type Result = { ok: true } | { ok: false; error: string };

/** Авторизация — два режима (аналог markTaskComplete) */
async function resolveAuth(childId: string): Promise<
  { ok: true; adminDb: ReturnType<typeof createAdminClient> } | { ok: false; error: string }
> {
  const cookieStore = await cookies();

  // Режим 1: pip_child_direct
  const directToken = cookieStore.get('pip_child_direct')?.value;
  if (directToken) {
    const session = verifyChildSession(directToken);
    if (!session || session.childId !== childId) {
      return { ok: false, error: 'Сессия ребёнка недействительна' };
    }
    return { ok: true, adminDb: createAdminClient() };
  }

  // Режим 2: родитель + pip_active_child
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const activeChild = cookieStore.get('pip_active_child')?.value;
  if (!activeChild || activeChild !== childId) {
    return { ok: false, error: 'Сначала зайди в режим ребёнка по PIN' };
  }

  return { ok: true, adminDb: createAdminClient() };
}

/** Установить / сменить цель-копилку */
export async function setGoal(input: {
  childId: string;
  rewardId: string;
}): Promise<Result> {
  const auth = await resolveAuth(input.childId);
  if (!auth.ok) return auth;

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
