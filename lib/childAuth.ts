/**
 * Единая авторизация детских действий (server actions + API).
 *
 * Раньше этот блок был скопирован в 4 местах (photoActions, shop/actions,
 * shop/goalActions, child/[id]/actions) + пятый вариант в push/subscribe, и
 * КАЖДАЯ копия доверяла HMAC-токену, не заглядывая в БД. Следствие: родитель
 * «удаляет» (архивирует) ребёнка, а тот ещё до 30 дней (TTL токена) выполняет
 * задания, льёт фото и заказывает награды — страницы закрыты, но server actions
 * это публичные эндпоинты и вызываются напрямую.
 *
 * Поэтому здесь одна точка правды: подпись токена — необходимое условие, но не
 * достаточное; профиль всегда сверяется с БД.
 */

import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyChildSession } from '@/lib/childSession';

const ACTIVE_CHILD_COOKIE = 'pip_active_child';
const DIRECT_SESSION_COOKIE = 'pip_child_direct';

export type ChildAuth =
  | { ok: true; adminDb: SupabaseClient; familyId: string; mode: 'direct' | 'parent' }
  | { ok: false; error: string };

/**
 * Живой ли это детский профиль указанной семьи.
 * Возвращает family_id профиля или null, если профиля нет / он архивирован /
 * это не ребёнок.
 */
async function liveChildFamilyId(
  adminDb: SupabaseClient,
  childId: string,
): Promise<string | null> {
  const { data } = await adminDb
    .from('profiles')
    .select('family_id, role, archived_at')
    .eq('id', childId)
    .maybeSingle();

  if (!data || data.role !== 'child' || data.archived_at) return null;
  return data.family_id as string;
}

export async function resolveChildAuth(childId: string): Promise<ChildAuth> {
  const cookieStore = await cookies();
  const adminDb = createAdminClient();

  // ── Режим 1: прямая детская сессия ───────────────────────────────────
  const directToken = cookieStore.get(DIRECT_SESSION_COOKIE)?.value;
  const directSession = directToken ? verifyChildSession(directToken) : null;
  if (directSession && directSession.childId === childId) {
    // Подписи мало: токен самодостаточен и живёт 30 дней. Сверяем с БД.
    const familyId = await liveChildFamilyId(adminDb, childId);
    if (familyId && familyId === directSession.familyId) {
      return { ok: true, adminDb, familyId, mode: 'direct' };
    }
    return { ok: false, error: 'Профиль недоступен. Попроси родителя открыть доступ заново.' };
  }

  // ── Режим 2: родитель в режиме ребёнка ───────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const activeChild = cookieStore.get(ACTIVE_CHILD_COOKIE)?.value;
  if (!activeChild || activeChild !== childId) {
    return { ok: false, error: 'Сначала зайди в режим ребёнка по PIN' };
  }

  const { data: me } = await adminDb
    .from('profiles')
    .select('family_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!me?.family_id) return { ok: false, error: 'Профиль родителя не найден' };

  const familyId = await liveChildFamilyId(adminDb, childId);
  if (!familyId || familyId !== me.family_id) {
    return { ok: false, error: 'Ребёнок не из вашей семьи' };
  }

  return { ok: true, adminDb, familyId, mode: 'parent' };
}
