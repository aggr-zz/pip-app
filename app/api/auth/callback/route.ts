import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Колбэк для OAuth (Google) и email-подтверждения.
 *
 * Supabase делает редирект на ?code=... после успешного входа,
 * мы обмениваем code на сессию и редиректим пользователя дальше.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/parent';

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
