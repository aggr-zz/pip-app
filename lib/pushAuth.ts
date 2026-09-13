import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyChildSession } from '@/lib/childSession';
import { resolveChildAuth } from '@/lib/childAuth';

const DIRECT_SESSION_COOKIE = 'pip_child_direct';

/**
 * Проверяет право вызывающего управлять push-подписками профиля `profileId`.
 *
 * Возвращает true, если:
 *   • залогинен родитель (Supabase-сессия) и profileId принадлежит его семье; ИЛИ
 *   • это ребёнок с валидной прямой сессией (cookie pip_child_direct) и
 *     session.childId === profileId.
 *
 * Живёт отдельным модулем, потому что этим пользуются оба канала пушей —
 * Web Push (/api/push/subscribe) и APNs (/api/push/apns). Держать две копии
 * такой проверки опасно: разъехавшиеся копии авторизации детских сессий уже
 * однажды дали дыру, из-за которой архивированный ребёнок сохранял доступ.
 *
 * Запись/удаление вызывающий делает admin-клиентом (service_role), а не клиентом
 * пользователя:
 *  — RLS-политика push_subscriptions завязана на `profile_id = auth.uid()`, но
 *    profile_id — это profiles.id, а auth.uid() — profiles.user_id (разные UUID),
 *    поэтому INSERT под обычным клиентом ВСЕГДА падал (→ 500);
 *  — у ребёнка Supabase-сессии нет вовсе (вход по PIN), auth.uid() пустой (→ 401).
 */
export async function authorizeProfileForPush(profileId: string): Promise<boolean> {
  // Режим 1: родитель (Supabase-сессия)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const admin = createAdminClient();
    const [{ data: me }, { data: target }] = await Promise.all([
      admin.from('profiles').select('family_id').eq('user_id', user.id).maybeSingle(),
      admin.from('profiles').select('family_id').eq('id', profileId).maybeSingle(),
    ]);
    if (me?.family_id && target?.family_id && me.family_id === target.family_id) {
      return true;
    }
  }

  // Режим 2: ребёнок (прямая сессия pip_child_direct).
  // Подписи токена НЕДОСТАТОЧНО: он живёт 30 дней, поэтому архивированный
  // ребёнок иначе продолжал бы управлять подписками. resolveChildAuth сверяет
  // профиль с БД (жив, role='child', не архивирован).
  const cookieStore = await cookies();
  const token = cookieStore.get(DIRECT_SESSION_COOKIE)?.value;
  if (token) {
    const session = verifyChildSession(token);
    if (session && session.childId === profileId) {
      const auth = await resolveChildAuth(profileId);
      return auth.ok && auth.mode === 'direct';
    }
  }

  return false;
}
