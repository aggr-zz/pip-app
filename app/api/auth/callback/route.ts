import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Колбэк для OAuth (Google) и email-подтверждения.
 *
 * Supabase делает редирект на ?code=... после успешного входа,
 * мы обмениваем code на сессию и редиректим пользователя дальше.
 */
/**
 * Разрешаем только локальные пути вида "/parent".
 * Отсекаем абсолютные URL и protocol-relative ("//evil.com", "/\evil.com"),
 * чтобы не было open redirect на чужой домен.
 */
function safeNext(raw: string | null): string {
  if (!raw) return '/parent';
  if (!raw.startsWith('/')) return '/parent';      // не относительный путь
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/parent'; // protocol-relative
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Что-то пошло не так — отправляем на логин
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
