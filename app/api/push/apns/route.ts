import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { authorizeProfileForPush } from '@/lib/pushAuth';

/**
 * Регистрация токена устройства для APNs (пуши в iOS-приложении).
 *
 * Web Push внутри WKWebView недоступен, поэтому у пользователей приложения это
 * единственный канал уведомлений. Авторизация — общая с /api/push/subscribe.
 */
export async function POST(req: NextRequest) {
  try {
    const { profileId, token } = await req.json();
    // Токен APNs — 64 шестнадцатеричных символа. Проверяем форму, чтобы в базу
    // не попадал мусор из подделанного запроса.
    if (!profileId || typeof token !== 'string' || !/^[0-9a-f]{64}$/i.test(token)) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    if (!(await authorizeProfileForPush(profileId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    // Конфликт по token, а не по паре (профиль, токен): на одном телефоне могут
    // по очереди войти разные члены семьи, и токен должен переехать к текущему —
    // иначе прежний продолжал бы получать чужие уведомления.
    const { error } = await admin
      .from('apns_devices')
      .upsert(
        { profile_id: profileId, token, updated_at: new Date().toISOString() },
        { onConflict: 'token' }
      );

    if (error) {
      console.error('[push/apns] upsert error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/apns] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { profileId, token } = await req.json();
    if (!profileId || typeof token !== 'string') {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }
    if (!(await authorizeProfileForPush(profileId))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    await admin.from('apns_devices').delete().eq('profile_id', profileId).eq('token', token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[push/apns] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
