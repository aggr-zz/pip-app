/**
 * Отправка транзакционных писем через HTTP API Unisender Go (порт 443).
 *
 * Зачем не SMTP: облачный провайдер (Selectel) блокирует исходящие SMTP-порты
 * (25/465/587/2525). HTTPS (443) открыт — поэтому шлём через REST API.
 *
 * Используется из /api/auth/email-hook (Send Email Hook GoTrue).
 */

const API_URL =
  process.env.UNISENDER_API_URL ||
  'https://go2.unisender.ru/ru/transactional/api/v1/email/send.json';
const API_KEY = process.env.UNISENDER_API_KEY || '';
const FROM_EMAIL = process.env.MAIL_FROM_EMAIL || 'noreply@pipup.ru';
const FROM_NAME = process.env.MAIL_FROM_NAME || 'PIP';

export async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!API_KEY) throw new Error('UNISENDER_API_KEY is not set');

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': API_KEY,
    },
    body: JSON.stringify({
      message: {
        recipients: [{ email: to }],
        body: { html },
        subject,
        from_email: FROM_EMAIL,
        from_name: FROM_NAME,
        // без трекинга. skip_unsubscribe не используем — требует флага
        // allow_skip_unsubscribe у аккаунта Unisender; футер отписки добавится сам.
        track_links: 0,
        track_read: 0,
      },
    }),
  });

  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* ответ без тела */
  }

  const status = (data as { status?: string } | null)?.status;
  if (!res.ok || status === 'error') {
    throw new Error(`Unisender send failed: HTTP ${res.status} ${JSON.stringify(data)}`);
  }
}
