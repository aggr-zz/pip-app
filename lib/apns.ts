import { createSign } from 'node:crypto';
import http2 from 'node:http2';

/**
 * Отправка пушей через APNs (Apple Push Notification service).
 *
 * Зачем: внутри WKWebView — а наша iOS-оболочка это он — Apple закрывает и
 * Web Push, и Service Worker. Существующие VAPID-пуши там не работают вовсе,
 * поэтому для приложения нужен нативный канал. В браузере и в RuStore-версии
 * Web Push продолжает работать как работал.
 *
 * Ключ (.p8), Key ID и Team ID берутся из окружения и в репозиторий не попадают.
 */

const HOST = 'api.push.apple.com';

function config() {
  const key = process.env.APNS_PRIVATE_KEY;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const topic = process.env.APNS_BUNDLE_ID || 'ru.pipup.app';
  if (!key || !keyId || !teamId) return null;
  // В переменных окружения переводы строк часто хранят как \n — PEM без реальных
  // переносов не распарсится, поэтому разворачиваем.
  return { key: key.replace(/\\n/g, '\n'), keyId, teamId, topic };
}

/** Настроен ли APNs. Позволяет молча пропускать отправку, пока ключа нет. */
export function apnsConfigured(): boolean {
  return config() !== null;
}

// APNs запрещает обновлять токен авторизации чаще раза в 20 минут и отвергает
// токены старше часа. Поэтому кешируем и обновляем раз в 30 минут.
let cachedJwt: { value: string; issuedAt: number } | null = null;
const JWT_TTL_MS = 30 * 60 * 1000;

function authToken(cfg: NonNullable<ReturnType<typeof config>>): string {
  const now = Date.now();
  if (cachedJwt && now - cachedJwt.issuedAt < JWT_TTL_MS) return cachedJwt.value;

  const header = { alg: 'ES256', kid: cfg.keyId };
  const claims = { iss: cfg.teamId, iat: Math.floor(now / 1000) };
  const b64 = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  const signingInput = `${b64(header)}.${b64(claims)}`;

  const signer = createSign('SHA256');
  signer.update(signingInput);
  // ВАЖНО: по умолчанию Node отдаёт ECDSA-подпись в DER, а JWT требует
  // «сырой» формат R||S (ieee-p1363). С DER APNs отвечает 403 InvalidProviderToken.
  const signature = signer.sign(
    { key: cfg.key, dsaEncoding: 'ieee-p1363' },
    'base64url'
  );

  const jwt = `${signingInput}.${signature}`;
  cachedJwt = { value: jwt, issuedAt: now };
  return jwt;
}

export type ApnsPayload = {
  title: string;
  body: string;
  /** Куда открыть приложение по тапу. Читается на стороне клиента. */
  url?: string;
};

/**
 * Шлёт уведомление на список токенов. Возвращает токены, которые Apple считает
 * мёртвыми, — их вызывающий код должен удалить из базы, иначе они копятся
 * навсегда и каждый пуш тратит время на заведомо провальные отправки.
 */
export async function sendApns(
  tokens: string[],
  payload: ApnsPayload
): Promise<{ deadTokens: string[] }> {
  const cfg = config();
  if (!cfg || tokens.length === 0) return { deadTokens: [] };

  let jwt: string;
  try {
    jwt = authToken(cfg);
  } catch (err) {
    console.error('[apns] не удалось подписать токен авторизации:', err);
    return { deadTokens: [] };
  }

  const body = JSON.stringify({
    aps: {
      alert: { title: payload.title, body: payload.body },
      sound: 'default',
    },
    url: payload.url,
  });

  const client = http2.connect(`https://${HOST}`);
  const dead: string[] = [];

  // Ошибку сессии нужно поглотить здесь: без обработчика 'error' Node роняет
  // процесс необработанным исключением, а упавший пуш не повод убивать сервер.
  const sessionFailed = new Promise<void>((resolve) => {
    client.on('error', (err) => {
      console.error('[apns] ошибка соединения:', err);
      resolve();
    });
  });

  const send = (token: string) =>
    new Promise<void>((resolve) => {
      const req = client.request({
        ':method': 'POST',
        ':path': `/3/device/${token}`,
        authorization: `bearer ${jwt}`,
        'apns-topic': cfg.topic,
        'apns-push-type': 'alert',
        'apns-priority': '10',
      });

      let status = 0;
      let raw = '';
      req.setTimeout(10_000, () => { req.close(); resolve(); });
      req.on('response', (headers) => { status = Number(headers[':status'] ?? 0); });
      req.on('data', (chunk) => { raw += chunk; });
      req.on('error', (err) => { console.error('[apns] ошибка отправки:', err); resolve(); });
      req.on('end', () => {
        if (status !== 200) {
          const reason = (() => {
            try { return JSON.parse(raw)?.reason as string | undefined; } catch { return undefined; }
          })();
          // 410 — устройство больше не зарегистрировано; 400 BadDeviceToken —
          // токен невалиден. И то и другое навсегда, токен надо удалить.
          if (status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered') {
            dead.push(token);
          } else {
            console.error(`[apns] отправка не прошла: ${status} ${reason ?? raw}`);
          }
        }
        resolve();
      });

      req.end(body);
    });

  try {
    await Promise.race([Promise.all(tokens.map(send)), sessionFailed]);
  } finally {
    client.close();
  }

  return { deadTokens: dead };
}
