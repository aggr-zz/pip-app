import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { sendTransactionalEmail } from '@/lib/email/unisender';
import { renderAuthEmail, type AuthEmailData } from '@/lib/email/authEmails';

/**
 * Send Email Hook для GoTrue (Supabase Auth).
 * GoTrue (вместо SMTP) шлёт сюда POST с данными письма; мы отправляем письмо
 * через HTTP API Unisender (порт 443 открыт, SMTP у провайдера заблокирован).
 *
 * Подпись — Standard Webhooks: webhook-id / webhook-timestamp / webhook-signature.
 */

export const runtime = 'nodejs';

// секрет = base64-часть из GOTRUE_HOOK_SEND_EMAIL_SECRETS (v1,whsec_<base64>)
const HOOK_SECRET = (process.env.SEND_EMAIL_HOOK_SECRET || '').replace(/^whsec_/, '');
// Публичный адрес приложения — ссылки подтверждения ведут на /auth/confirm.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pipup.ru';

function verifySignature(
  id: string | null,
  ts: string | null,
  sigHeader: string | null,
  rawBody: string,
): boolean {
  if (!id || !ts || !sigHeader || !HOOK_SECRET) return false;
  const key = Buffer.from(HOOK_SECRET, 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${rawBody}`).digest('base64');
  const expBuf = Buffer.from(expected);
  // заголовок — список "v1,<sig>" через пробел
  return sigHeader.split(' ').some((entry) => {
    const sig = entry.includes(',') ? entry.split(',')[1] : entry;
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf);
  });
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  if (!verifySignature(
    req.headers.get('webhook-id'),
    req.headers.get('webhook-timestamp'),
    req.headers.get('webhook-signature'),
    raw,
  )) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: { user?: { email?: string }; email_data?: AuthEmailData };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'bad json' }, { status: 400 });
  }

  const email = payload.user?.email;
  const emailData = payload.email_data;
  if (!email || !emailData) {
    return NextResponse.json({ error: 'missing email/email_data' }, { status: 400 });
  }

  const { subject, html } = renderAuthEmail(emailData, AUTH_API_BASE);

  try {
    await sendTransactionalEmail(email, subject, html);
  } catch (e) {
    console.error('[email-hook] send failed:', e);
    return NextResponse.json({ error: 'send failed' }, { status: 500 });
  }

  return NextResponse.json({});
}
