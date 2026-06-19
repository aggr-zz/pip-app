import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Подтверждение email / сброса пароля по token_hash (OTP), а НЕ по ?code.
 *
 * Зачем: обмен ?code (exchangeCodeForSession, PKCE) требует code_verifier из
 * того же браузера, где начали регистрацию/сброс. Реальные семьи открывают
 * письмо на другом устройстве (зарегались на ноутбуке → письмо на телефоне),
 * и подтверждение молча падало. verifyOtp({token_hash}) не требует verifier и
 * работает кросс-девайс.
 *
 * Ссылку на этот роут формирует письмо (lib/email/authEmails.ts).
 */

function safeNext(raw: string | null): string {
  if (!raw) return '/parent';
  if (!raw.startsWith('/')) return '/parent';
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/parent';
  return raw;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(searchParams.get('next'));

  // За nginx request.url содержит внутренний хост — для редиректов берём
  // канонический публичный адрес.
  const base = process.env.NEXT_PUBLIC_SITE_URL || origin;

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // Для recovery всегда ведём на форму нового пароля (сессия уже установлена).
      const dest = type === 'recovery' ? '/reset-password' : next;
      return NextResponse.redirect(`${base}${dest}`);
    }
    console.error('[auth/confirm] verifyOtp failed:', error.message);
  }

  return NextResponse.redirect(`${base}/login?error=auth_confirm_failed`);
}
