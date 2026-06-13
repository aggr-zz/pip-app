'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { sendPushToProfile } from '@/lib/webpush';

type Result<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };


/**
 * Пост-обработка после успешного аппрува заявки: удалить фото из Storage,
 * проверить достижения и отправить пуш ребёнку. Общая для одиночного
 * подтверждения и «Подтвердить все» — чтобы поведение не расходилось.
 */
async function afterApprove(
  supabase: Awaited<ReturnType<typeof createClient>>,
  completionId: string,
  row: { photo_path?: string | null; awarded?: number | null } | null,
): Promise<void> {
  if (row?.photo_path) {
    const { error } = await supabase.storage.from('task-photos').remove([row.photo_path]);
    if (error) console.warn('[approve] не удалось удалить фото:', error);
  }

  const { data: completion } = await supabase
    .from('task_completions')
    .select('profile_id')
    .eq('id', completionId)
    .single();

  if (completion?.profile_id) {
    try {
      await supabase.rpc('check_achievements', { p_profile_id: completion.profile_id });
    } catch (e) {
      console.warn('[approve] check_achievements failed:', e);
    }
    revalidatePath(`/child/${completion.profile_id}/achievements`);
    void sendPushToProfile(completion.profile_id, {
      title: '🎉 Задание подтверждено!',
      body: `+${row?.awarded ?? 0} PIP зачислено на счёт`,
      url: `/child/${completion.profile_id}`,
    });
  }
}


// ─── APPROVE ──────────────────────────────────────────────────────────
/**
 * Родитель подтверждает выполнение задачи.
 *
 * awarded:
 *   - undefined → начислить полную сумму task.coin_value
 *   - 0..task.coin_value → начислить указанную сумму (например, 50% за неполное)
 *
 * После аппрува: фото удаляется из Storage (privacy).
 */
export async function approveCompletion(input: {
  completionId: string;
  awarded?: number;
}): Promise<Result<{ awarded: number; balance: number }>> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  // Вызов RPC. Проверка прав внутри функции.
  const { data, error } = await supabase.rpc('approve_task_completion', {
    p_completion_id: input.completionId,
    p_awarded: input.awarded ?? null,
  });

  if (error) {
    console.error('[approveCompletion]', error);
    return { ok: false, error: error.message || 'Не получилось подтвердить' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, error: 'Пустой ответ от БД' };

  await afterApprove(supabase, input.completionId, row);

  revalidatePath('/parent/approvals');
  revalidatePath('/parent');

  return {
    ok: true,
    awarded: row.awarded ?? 0,
    balance: row.new_balance ?? 0,
  };
}


// ─── REJECT ───────────────────────────────────────────────────────────
/**
 * Родитель отклоняет выполнение. Монеты не начисляются.
 * Reason обязателен — ребёнок должен понимать почему.
 *
 * После реджекта: фото удаляется из Storage.
 */
export async function rejectCompletion(input: {
  completionId: string;
  reason: string;
}): Promise<Result> {
  const reason = (input.reason ?? '').trim();
  if (!reason) {
    return { ok: false, error: 'Напиши, почему отклоняешь — это поможет ребёнку' };
  }
  if (reason.length > 500) {
    return { ok: false, error: 'Слишком длинный комментарий (макс 500)' };
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data, error } = await supabase.rpc('reject_task_completion', {
    p_completion_id: input.completionId,
    p_reason: reason,
  });

  if (error) {
    console.error('[rejectCompletion]', error);
    return { ok: false, error: error.message || 'Не получилось отклонить' };
  }

  const row = Array.isArray(data) ? data[0] : data;

  // Удаляем фото
  if (row?.photo_path) {
    const { error: deleteError } = await supabase.storage
      .from('task-photos')
      .remove([row.photo_path]);
    if (deleteError) {
      console.warn('[rejectCompletion] не удалось удалить фото:', deleteError);
    }
  }

  // Push notification to child
  const { data: rejCompletion } = await supabase
    .from('task_completions')
    .select('profile_id')
    .eq('id', input.completionId)
    .single();

  if (rejCompletion?.profile_id) {
    void sendPushToProfile(rejCompletion.profile_id, {
      title: '❌ Задание отклонено',
      body: reason.length > 80 ? reason.slice(0, 77) + '…' : reason,
      url: `/child/${rejCompletion.profile_id}`,
    });
  }

  revalidatePath('/parent/approvals');
  revalidatePath('/parent');

  return { ok: true };
}


// ─── APPROVE ALL ──────────────────────────────────────────────────────
/**
 * Подтверждает все pending completions сразу (полная сумма).
 */
export async function approveAllCompletions(input: {
  completionIds: string[];
}): Promise<Result<{ count: number }>> {
  if (!input.completionIds.length) return { ok: true, count: 0 };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  let approved = 0;
  for (const completionId of input.completionIds) {
    const { data, error } = await supabase.rpc('approve_task_completion', {
      p_completion_id: completionId,
      p_awarded: null, // полная сумма
    });
    if (error) continue;
    approved++;
    // То же, что в одиночном подтверждении: фото/достижения/пуш.
    const row = Array.isArray(data) ? data[0] : data;
    await afterApprove(supabase, completionId, row);
  }

  revalidatePath('/parent/approvals');
  revalidatePath('/parent');

  return { ok: true, count: approved };
}


// ─── AUTO-APPROVE SWEEP ───────────────────────────────────────────────
/**
 * Лениво автоаппрувит pending старше families.auto_approve_hours.
 * Вызывается на /parent/approvals и /parent (для актуального счётчика).
 *
 * Возвращает количество автоаппрувнутых.
 */
export async function autoApproveSweep(): Promise<number> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') return 0;

  const { data, error } = await supabase.rpc('auto_approve_pending_completions', {
    p_family_id: me.family_id,
  });

  if (error) {
    console.warn('[autoApproveSweep]', error);
    return 0;
  }

  return typeof data === 'number' ? data : 0;
}


// ─── GET SIGNED PHOTO URL ─────────────────────────────────────────────
/**
 * Создаёт временную ссылку (60 сек) для просмотра фото в браузере.
 * Бакет приватный, прямые URL не работают.
 */
export async function getPhotoUrl(photoPath: string): Promise<string | null> {
  if (!photoPath) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from('task-photos')
    .createSignedUrl(photoPath, 60);

  if (error) {
    console.warn('[getPhotoUrl]', error);
    return null;
  }

  return data.signedUrl;
}
