/**
 * Единая авторизация родителя для server actions и страниц /parent/*.
 *
 * Раньше блок «getUser + профиль + проверка role==='parent'» был скопирован
 * в ~20 файлах (и тексты ошибок успели разойтись). Этот хелпер — аналог
 * lib/getChildContext.ts, но для родителя. Возвращает Result, чтобы
 * server action мог сделать ранний return.
 */

import { createClient } from '@/lib/supabase/server';

export interface ParentContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  familyId: string;
  profileId: string;
}

export async function getParentContext(): Promise<
  { ok: true; ctx: ParentContext } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: me } = await supabase
    .from('profiles')
    .select('id, family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent' || !me.family_id) {
    return { ok: false, error: 'Только родитель' };
  }

  return { ok: true, ctx: { supabase, familyId: me.family_id, profileId: me.id } };
}
