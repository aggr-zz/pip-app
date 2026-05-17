'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Result<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

export type LimitType = 'unlimited' | 'once';
// 'weekly' и 'monthly' пока не поддерживаем в UI — отложено на Sprint 7.

export interface RewardInput {
  title: string;
  description?: string | null;
  icon: string; // эмодзи или ключ
  coin_cost: number;
  limit_type: LimitType;
  available_to: string[]; // пустой массив = всем детям
}

function validateReward(input: RewardInput): string | null {
  const title = (input.title ?? '').trim();
  if (!title) return 'Введи название награды';
  if (title.length > 80) return 'Название слишком длинное (макс 80)';
  if (input.description && input.description.length > 300) {
    return 'Описание слишком длинное (макс 300)';
  }
  if (!Number.isInteger(input.coin_cost) || input.coin_cost < 1 || input.coin_cost > 100000) {
    return 'Цена должна быть от 1 до 100 000 pip';
  }
  if (!['unlimited', 'once'].includes(input.limit_type)) {
    return 'Неверный тип лимита';
  }
  return null;
}


// ─── CREATE ───────────────────────────────────────────────────────────
export async function createReward(input: RewardInput): Promise<Result<{ id: string }>> {
  const validationError = validateReward(input);
  if (validationError) return { ok: false, error: validationError };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') {
    return { ok: false, error: 'Только родитель может создавать награды' };
  }

  // Проверяем что все available_to — дети семьи (если задано)
  if (input.available_to.length > 0) {
    const { data: children } = await supabase
      .from('profiles')
      .select('id')
      .eq('family_id', me.family_id)
      .eq('role', 'child')
      .in('id', input.available_to);

    if (!children || children.length !== input.available_to.length) {
      return { ok: false, error: 'Не все указанные дети найдены в семье' };
    }
  }

  const { data: newReward, error } = await supabase
    .from('rewards')
    .insert({
      family_id: me.family_id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      icon: input.icon,
      coin_cost: input.coin_cost,
      limit_type: input.limit_type,
      available_to: input.available_to.length > 0 ? input.available_to : null,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[createReward]', error);
    return { ok: false, error: 'Не получилось создать награду' };
  }

  revalidatePath('/parent/rewards');
  return { ok: true, id: newReward.id };
}


// ─── ARCHIVE / UNARCHIVE ──────────────────────────────────────────────
export async function archiveReward(rewardId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') return { ok: false, error: 'Только родитель' };

  const { error } = await supabase
    .from('rewards')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', rewardId)
    .eq('family_id', me.family_id);

  if (error) {
    console.error('[archiveReward]', error);
    return { ok: false, error: 'Не получилось архивировать' };
  }

  revalidatePath('/parent/rewards');
  return { ok: true };
}

export async function unarchiveReward(rewardId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') return { ok: false, error: 'Только родитель' };

  const { error } = await supabase
    .from('rewards')
    .update({ archived_at: null })
    .eq('id', rewardId)
    .eq('family_id', me.family_id);

  if (error) {
    console.error('[unarchiveReward]', error);
    return { ok: false, error: 'Не получилось восстановить' };
  }

  revalidatePath('/parent/rewards');
  return { ok: true };
}
