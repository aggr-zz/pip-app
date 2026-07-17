/**
 * Универсальный хелпер авторизации для страниц /child/[id].
 *
 * Два режима доступа:
 *   1. «parent» — родитель вошёл по Supabase-авторизации + cookie pip_active_child
 *   2. «direct» — ребёнок вошёл напрямую через /join, cookie pip_child_direct
 *
 * Возвращает { db, familyId, mode } или делает redirect.
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyChildSession } from '@/lib/childSession';
import type { SupabaseClient } from '@supabase/supabase-js';

const ACTIVE_CHILD_COOKIE  = 'pip_active_child';
const DIRECT_SESSION_COOKIE = 'pip_child_direct';

export type ChildAccessMode = 'parent' | 'direct';

export interface ChildContext {
  db:       SupabaseClient;
  familyId: string;
  mode:     ChildAccessMode;
}

export async function getChildContext(childId: string): Promise<ChildContext> {
  const cookieStore = await cookies();

  // ── Режим 1: родительская Supabase-сессия ────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeChild = cookieStore.get(ACTIVE_CHILD_COOKIE)?.value;

  if (user && activeChild === childId) {
    const { data: me } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('user_id', user.id)
      .single();
    if (me?.family_id) {
      // Перепроверяем на чтении, что childId действительно ребёнок этой семьи,
      // а не доверяем cookie pip_active_child (он мог устареть/быть подменён).
      const { data: child } = await supabase
        .from('profiles')
        .select('family_id, role')
        .eq('id', childId)
        .single();
      if (child?.role === 'child' && child.family_id === me.family_id) {
        return { db: supabase, familyId: me.family_id, mode: 'parent' };
      }
    }
  }

  // ── Режим 2: прямая детская сессия ───────────────────────────────────
  const directToken = cookieStore.get(DIRECT_SESSION_COOKIE)?.value;
  if (directToken) {
    const session = verifyChildSession(directToken);
    if (session && session.childId === childId) {
      const admin = createAdminClient();
      // Токен самодостаточен и живёт 30 дней, поэтому одной подписи мало:
      // без перепроверки профиля «удалённый» (archived) ребёнок продолжал бы
      // пользоваться приложением до истечения токена, а родитель был бы уверен,
      // что закрыл доступ. Один SELECT на запрос — цена отзываемости доступа.
      const { data: child } = await admin
        .from('profiles')
        .select('family_id, role, archived_at')
        .eq('id', session.childId)
        .maybeSingle();

      if (
        child &&
        child.role === 'child' &&
        !child.archived_at &&
        child.family_id === session.familyId
      ) {
        return { db: admin, familyId: child.family_id, mode: 'direct' };
      }
      // Профиль удалён/архивирован/сменил семью → сессия недействительна.
    }
  }

  // Ни один режим не подошёл.
  //  • Если есть залогиненный родитель (но не в режиме этого ребёнка) → дашборд.
  //  • Иначе это ребёнок с истёкшей/невалидной прямой сессией → ведём на его
  //    собственный вход по PIN/QR, а не на родительский /login (там тупик —
  //    ребёнку нечего вводить, и нужна новая join-ссылка от родителя).
  if (user) redirect('/parent');
  redirect(`/join/${childId}`);
}
