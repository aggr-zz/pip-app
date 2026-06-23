import { NextResponse, type NextRequest } from 'next/server';

/**
 * Старт собственной интеграции входа через Яндекс.
 *
 * GoTrue не поддерживает Yandex как встроенный провайдер, поэтому OAuth-поток
 * реализован вручную: тут — редирект на страницу авторизации Яндекса с
 * CSRF-параметром state (кладём его в httpOnly-cookie и сверяем в колбэке).
 * Колбэк (/api/auth/yandex/callback) обменивает code на профиль и создаёт
 * сессию Supabase.
 */

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/parent';
  return raw;
}

export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const clientId = process.env.YANDEX_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(`${base}/login?error=yandex_not_configured`);
  }

  const next = safeNext(new URL(request.url).searchParams.get('next'));
  const state = crypto.randomUUID();
  const redirectUri = `${base}/api/auth/yandex/callback`;

  const authUrl =
    'https://oauth.yandex.ru/authorize?response_type=code' +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`;

  const res = NextResponse.redirect(authUrl);
  // state + next переживут редирект на Яндекс и вернутся в колбэк
  res.cookies.set('yandex_oauth', `${state}|${next}`, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  });
  return res;
}
