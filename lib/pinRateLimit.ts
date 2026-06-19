/**
 * Ограничение попыток ввода PIN ребёнка — защита от перебора и от DoS.
 *
 * Хранилище — в БД (таблица auth_rate_limits + RPC), а не in-memory:
 *   • переживает рестарты/редеплои (раньше счётчик обнулялся при каждом деплое);
 *   • общий стор при нескольких процессах/инстансах.
 *
 * Ключ — childId + IP. childId виден в публичной ссылке /join/[childId], поэтому
 * лок ТОЛЬКО по childId позволял любому со ссылкой залочить вход ребёнку (DoS).
 * Привязка к IP оставляет лимит атакующему, не блокируя легитимного ребёнка.
 *
 * Fail-open: если БД недоступна — не блокируем (лучше пропустить, чем закрыть
 * вход всем). Перебор всё равно ограничен 5 попытками за 15 минут на ключ.
 */

import { createAdminClient } from '@/lib/supabase/admin';

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;
const WINDOW_SECONDS = 15 * 60;

/** Достаёт клиентский IP из заголовков (за nginx — x-forwarded-for/x-real-ip). */
export function clientIpFromHeaders(h: { get(name: string): string | null }): string {
  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return h.get('x-real-ip') || 'noip';
}

function key(childId: string, ip: string): string {
  return `pin:${childId}:${ip || 'noip'}`;
}

/** Заблокирован ли (childId, ip) сейчас. */
export async function isPinLocked(
  childId: string,
  ip: string,
): Promise<{ locked: boolean; retryAfterSec: number }> {
  try {
    const db = createAdminClient();
    const { data } = await db.rpc('rate_limit_check', { p_key: key(childId, ip) });
    const sec = typeof data === 'number' ? data : 0;
    return { locked: sec > 0, retryAfterSec: sec };
  } catch (e) {
    console.warn('[pinRateLimit.isPinLocked] fail-open:', e);
    return { locked: false, retryAfterSec: 0 };
  }
}

/** Зафиксировать неудачную попытку; при достижении лимита БД выставит лок. */
export async function recordPinFailure(childId: string, ip: string): Promise<void> {
  try {
    const db = createAdminClient();
    await db.rpc('rate_limit_fail', {
      p_key: key(childId, ip),
      p_max: MAX_ATTEMPTS,
      p_lock_seconds: LOCK_SECONDS,
      p_window_seconds: WINDOW_SECONDS,
    });
  } catch (e) {
    console.warn('[pinRateLimit.recordPinFailure]', e);
  }
}

/** Сбросить счётчик (после успешного входа). */
export async function clearPinAttempts(childId: string, ip: string): Promise<void> {
  try {
    const db = createAdminClient();
    await db.rpc('rate_limit_clear', { p_key: key(childId, ip) });
  } catch (e) {
    console.warn('[pinRateLimit.clearPinAttempts]', e);
  }
}
