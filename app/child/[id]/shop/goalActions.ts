'use server';

import { revalidatePath } from 'next/cache';
import { resolveChildAuth as resolveAuth } from '@/lib/childAuth';

type Result = { ok: true } | { ok: false; error: string };

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
