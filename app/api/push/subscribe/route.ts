import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyChildSession } from '@/lib/childSession';
import { resolveChildAuth } from '@/lib/childAuth';

const DIRECT_SESSION_COOKIE = 'pip_child_direct';

/**
 * Проверяет право вызывающего управлять push-подпиской профиля `profileId`.
 *
 * Возвращает true, если:
 *   • залогинен родитель (Supabase-сессия) и profileId принадлежит профилю его семьи; ИЛИ
 *   • это ребёнок с валидной прямой сессией (cookie pip_child_direct) и session.childId === profileId.
 *
 * Запись/удаление делаем admin-клиентом (service_role), а не клиентом пользователя:
 *  — RLS-политика таблицы завязана на `profile_id = auth.uid()`, но profile_id — это
 *    profiles.id, а auth.uid() — это profiles.user_id (разные UUID), поэтому INSERT
 *    под обычным клиентом ВСЕГДА падал (→ 500);
 *  — у ребёнка Supabase-сессии нет вовсе (вход по PIN), auth.uid() пустой (→ был 401).
 */
async function authorizeProfile(profileId: string): Promise<boolean> {
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
  // ребёнок иначе продолжал бы управлять push-подписками. resolveChildAuth
  // сверяет профиль с БД (жив, role='child', не архивирован).
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

export async function POST(req: NextRequest) {
  try {
    const { profileId, subscription } = await req.json();
    if (
      !profileId ||
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    if (!(await authorizeProfile(profileId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from('push_subscriptions')
      .upsert(
        {
          profile_id: profileId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
        { onConflict: 'profile_id,endpoint' }
      );

    if (error) {
      console.error('[push/subscribe] upsert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { profileId, endpoint } = await req.json();
    if (!profileId || !endpoint) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    if (!(await authorizeProfile(profileId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    await admin
      .from('push_subscriptions')
      .delete()
      .eq('profile_id', profileId)
      .eq('endpoint', endpoint);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
