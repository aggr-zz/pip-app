import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { sendTransactionalEmail } from '@/lib/email/unisender';
import { renderAuthEmail, type AuthEmailData } from '@/lib/email/authEmails';
import { createAdminClient } from '@/lib/supabase/admin';

// Лимит писем на один адрес (защита баланса Unisender и репутации отправителя
// от спама signup/recover, которые ходят из браузера напрямую в GoTrue).
const MAX_EMAILS_PER_HOUR = 8;

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

/** Допуск по свежести вебхука (Standard Webhooks рекомендует ±5 мин). */
const TIMESTAMP_TOLERANCE_SEC = 5 * 60;

function isFresh(ts: string | null): boolean {
  if (!ts) return false;
  const sent = Number(ts);
  if (!Number.isFinite(sent)) return false;
  return Math.abs(Date.now() / 1000 - sent) <= TIMESTAMP_TOLERANCE_SEC;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const ts = req.headers.get('webhook-timestamp');

  // Свежесть — обязательная половина Standard Webhooks: без неё подпись
  // превращается в «вечный пропуск», и перехваченный запрос можно бесконечно
  // реплеить (повторная рассылка писем, в т.ч. со ссылками сброса).
  if (!isFresh(ts)) {
    return NextResponse.json({ error: 'stale timestamp' }, { status: 401 });
  }

  if (!verifySignature(
    req.headers.get('webhook-id'),
    ts,
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

  // Троттлинг по адресу: не больше MAX_EMAILS_PER_HOUR писем в час. При превышении
  // тихо не отправляем (отдаём 200, чтобы GoTrue не зациклился на ретраях).
  const limitKey = `email:${email.toLowerCase()}`;
  try {
    const db = createAdminClient();
    const { data: lockedSec } = await db.rpc('rate_limit_check', { p_key: limitKey });
    if (typeof lockedSec === 'number' && lockedSec > 0) {
      console.warn('[email-hook] throttled:', email);
      return NextResponse.json({});
    }
  } catch (e) {
    // Fail-open: при недоступности лимитера письма всё равно шлём.
    console.warn('[email-hook] rate check failed (open):', e);
  }

  const { subject, html } = renderAuthEmail(emailData, SITE_URL);

  try {
    await sendTransactionalEmail(email, subject, html);
  } catch (e) {
    console.error('[email-hook] send failed:', e);
    return NextResponse.json({ error: 'send failed' }, { status: 500 });
  }

  // Учитываем успешную отправку (после MAX за час адрес временно блокируется).
  try {
    const db = createAdminClient();
    await db.rpc('rate_limit_fail', {
      p_key: limitKey,
      p_max: MAX_EMAILS_PER_HOUR,
      p_lock_seconds: 3600,
      p_window_seconds: 3600,
    });
  } catch (e) {
    console.warn('[email-hook] rate record failed:', e);
  }

  return NextResponse.json({});
}
