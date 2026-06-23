import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Колбэк собственной интеграции Яндекс-входа.
 *
 * 1. Сверяем state (CSRF) с cookie.
 * 2. Меняем code на access_token Яндекса, тянем профиль (email + имя).
 * 3. Через admin API создаём пользователя (если новый) — триггер handle_new_user
 *    заводит семью+профиль родителя; для существующего просто продолжаем.
 * 4. Минтим сессию: admin.generateLink(magiclink) → token_hash → verifyOtp
 *    (SSR-клиент пишет cookie сессии так же, как /api/auth/callback).
 */

function safeNext(raw: string | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/parent';
  return raw;
}

export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const params = new URL(request.url).searchParams;
  const cookieStore = await cookies();

  const saved = cookieStore.get('yandex_oauth')?.value || '';
  const [savedState, savedNext] = saved.split('|');
  const next = safeNext(savedNext);
  const host = new URL(base).hostname;
  const cookieDomain = host.includes('.') && !host.endsWith('localhost')
    ? '.' + host.replace(/^www\./, '')
    : undefined;
  cookieStore.set('yandex_oauth', '', { maxAge: 0, path: '/', ...(cookieDomain ? { domain: cookieDomain } : {}) });

  const fail = (reason: string) => NextResponse.redirect(`${base}/login?error=${reason}`);

  const code = params.get('code');
  const state = params.get('state');
  if (params.get('error')) return fail('yandex_denied');
  if (!code || !state || !savedState || state !== savedState) {
    console.error('[yandex] state fail', { hasCode: !!code, hasState: !!state, hasSavedCookie: !!savedState, match: state === savedState });
    return fail('yandex_state');
  }

  const clientId = process.env.YANDEX_CLIENT_ID;
  const clientSecret = process.env.YANDEX_SECRET;
  if (!clientId || !clientSecret) return fail('yandex_not_configured');

  // 1. code → access_token
  let accessToken: string | undefined;
  try {
    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${base}/api/auth/yandex/callback`,
      }),
    });
    if (!tokenRes.ok) return fail('yandex_token');
    accessToken = (await tokenRes.json())?.access_token;
  } catch {
    return fail('yandex_token');
  }
  if (!accessToken) return fail('yandex_token');

  // 2. профиль Яндекса
  let email = '';
  let name = 'Родитель';
  try {
    const infoRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!infoRes.ok) return fail('yandex_info');
    const info = await infoRes.json();
    email = String(info.default_email || (info.emails && info.emails[0]) || '').toLowerCase().trim();
    name = String(info.real_name || info.display_name || info.first_name || 'Родитель').trim() || 'Родитель';
  } catch {
    return fail('yandex_info');
  }
  if (!email) return fail('yandex_noemail');

  // 3. найти/создать пользователя
  const admin = createAdminClient();
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { name, provider: 'yandex' },
  });
  if (created.error && !/registered|already|exists/i.test(created.error.message)) {
    console.error('[yandex] createUser:', created.error.message);
    return fail('yandex_create');
  }

  // 4. сессия через magiclink token_hash
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) {
    console.error('[yandex] generateLink:', link.error?.message);
    return fail('yandex_link');
  }

  const supabase = await createClient();
  const { error: vErr } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (vErr) {
    console.error('[yandex] verifyOtp:', vErr.message);
    return fail('yandex_verify');
  }

  return NextResponse.redirect(`${base}${next}`);
}
