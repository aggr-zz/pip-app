/**
 * Подписанные токены детской сессии.
 * Используются когда ребёнок входит напрямую через /join/[childId]
 * без Supabase-сессии родителя.
 *
 * Формат токена: base64url(JSON).HMAC-SHA256
 */

import { createHmac } from 'crypto';

function resolveSecret(): string {
  const fromEnv = process.env.CHILD_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 32) return fromEnv;

  // В production секрет обязателен и должен быть достаточно длинным —
  // иначе токены детских сессий становятся подделываемыми. Падаем сразу,
  // чтобы небезопасная конфигурация не уехала в прод.
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CHILD_SESSION_SECRET must be set to a random string of at least 32 characters in production'
    );
  }
  // Только для локальной разработки.
  console.warn(
    '[childSession] CHILD_SESSION_SECRET не задан — использую небезопасный dev-секрет (только для разработки)'
  );
  return 'dev-secret-please-set-CHILD_SESSION_SECRET-in-env-32chars+';
}

const SECRET = resolveSecret();

const TTL_DAYS = 30;

export interface ChildSession {
  childId:  string;
  familyId: string;
  exp:      number; // unix timestamp
}

export function signChildSession(childId: string, familyId: string): string {
  const payload: ChildSession = {
    childId,
    familyId,
    exp: Math.floor(Date.now() / 1000) + TTL_DAYS * 86_400,
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig  = createHmac('sha256', SECRET).update(data).digest('hex');
  return `${data}.${sig}`;
}

export function verifyChildSession(token: string): ChildSession | null {
  try {
    const dot  = token.lastIndexOf('.');
    if (dot === -1) return null;
    const data = token.slice(0, dot);
    const sig  = token.slice(dot + 1);
    const expected = createHmac('sha256', SECRET).update(data).digest('hex');
    // Constant-time comparison to avoid timing attacks
    if (sig.length !== expected.length) return null;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    if (diff !== 0) return null;
    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString()
    ) as ChildSession;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
