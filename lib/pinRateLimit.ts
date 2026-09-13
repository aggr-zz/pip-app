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

// Лимит по (childId + IP): жёстко режет перебор с одного адреса, но не блокирует
// легитимного ребёнка (привязка к IP). childId публичен → лок только по childId
// дал бы DoS любому со ссылкой.
const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;
const WINDOW_SECONDS = 15 * 60;

// ГЛОБАЛЬНЫЙ лимит по одному childId, независимый от IP. Нужен потому, что
// X-Forwarded-For подставляется клиентом: меняя IP/заголовок, атакующий получал
// бы свежий per-IP бюджет и перебирал 4-значный PIN (10000 комбинаций) за минуты.
// Потолок выбран высоким (легитимный ребёнок столько неверных PIN не введёт),
// но достаточным, чтобы ограничить перебор даже при ротации IP. Компромисс — при
// 50 неверных попытках вход ребёнку залочит на 30 мин (родитель может сбросить PIN).
const MAX_GLOBAL = 50;
const GLOBAL_LOCK_SECONDS = 30 * 60;
const GLOBAL_WINDOW_SECONDS = 30 * 60;

/**
 * Достаёт клиентский IP из заголовков. ВАЖНО: первый (левый) сегмент
 * X-Forwarded-For подставляет сам клиент — доверять ему нельзя. Берём:
 *   1) x-real-ip (его должен ставить доверенный nginx: proxy_set_header X-Real-IP $remote_addr);
 *   2) иначе ПОСЛЕДНИЙ сегмент XFF — его дописывает ближайший доверенный прокси
 *      ($proxy_add_x_forwarded_for), а не клиент.
 * Полная защита требует, чтобы nginx переписывал/дописывал эти заголовки; глобальный
 * лимит по childId (см. MAX_GLOBAL) — backstop на случай неверной конфигурации прокси.
 */
export function clientIpFromHeaders(h: { get(name: string): string | null }): string {
  const real = h.get('x-real-ip');
  if (real && real.trim()) return real.trim();
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'noip';
}

function key(childId: string, ip: string): string {
  return `pin:${childId}:${ip || 'noip'}`;
}

function globalKey(childId: string): string {
  return `pin-global:${childId}`;
}

/**
 * Регистрирует попытку входа и сразу говорит, заблокирован ли вход.
 *
 * Заменяет пару isPinLocked + recordPinFailure. Раньше между проверкой и
 * записью оставалось окно: пачка параллельных запросов целиком проходила
 * проверку (лока ещё нет) и только потом увеличивала счётчик — за один заход
 * атакующий получал столько попыток, какова его параллельность. RPC
 * rate_limit_hit делает обе операции под блокировкой строки, поэтому
 * параллельные попытки по одному ключу выстраиваются в очередь.
 *
 * Вызывать ДО сравнения PIN. При успешном входе счётчики снимает
 * clearPinAttempts.
 *
 * Fail-open: если БД недоступна — пропускаем. Лучше пустить, чем закрыть вход
 * всем; перебор всё равно ограничен, когда база вернётся.
 */
export async function registerPinAttempt(
  childId: string,
  ip: string,
): Promise<{ locked: boolean; retryAfterSec: number }> {
  try {
    const db = createAdminClient();
    // Два независимых бюджета: по паре (ребёнок+IP) и глобальный по ребёнку.
    // Каждый атомарен сам по себе; блокирует тот, который сработал раньше.
    const [perIp, global] = await Promise.all([
      db.rpc('rate_limit_hit', {
        p_key: key(childId, ip),
        p_max: MAX_ATTEMPTS,
        p_lock_seconds: LOCK_SECONDS,
        p_window_seconds: WINDOW_SECONDS,
      }),
      db.rpc('rate_limit_hit', {
        p_key: globalKey(childId),
        p_max: MAX_GLOBAL,
        p_lock_seconds: GLOBAL_LOCK_SECONDS,
        p_window_seconds: GLOBAL_WINDOW_SECONDS,
      }),
    ]);
    const a = typeof perIp.data === 'number' ? perIp.data : 0;
    const b = typeof global.data === 'number' ? global.data : 0;
    const sec = Math.max(a, b);
    return { locked: sec > 0, retryAfterSec: sec };
  } catch (e) {
    console.warn('[pinRateLimit.registerPinAttempt] fail-open:', e);
    return { locked: false, retryAfterSec: 0 };
  }
}

/*
 * isPinLocked и recordPinFailure удалены намеренно.
 *
 * Это была пара «сначала проверить, потом записать», и между двумя вызовами
 * оставалось окно: пачка параллельных запросов проходила проверку целиком,
 * пока ни одна неудача ещё не записана. Их заменил один атомарный
 * registerPinAttempt (RPC rate_limit_hit, проверка и инкремент под блокировкой
 * строки). Оставлять старые экспорты опасно — из них легко снова собрать ту же
 * небезопасную пару.
 */

/**
 * Снять ВСЕ локи перебора для ребёнка — и глобальный, и все per-IP.
 *
 * Нужно при сбросе PIN родителем: ребёнка залочило по ЕГО IP, а родитель
 * сбрасывает со своего — clearPinAttempts(childId, ipРодителя) персональный лок
 * ребёнка не снимет. Без этого обещание «родитель может сбросить PIN» (которым
 * обоснован глобальный лок ниже) не работает: ребёнок не войдёт и с новым PIN.
 *
 * childId валидируем ЗДЕСЬ, а не полагаемся на вызывающего: строка уходит в LIKE
 * под service_role (в обход RLS), и `pin:%:%` вычистил бы локи всех детей всех
 * семей. Раньше это спасал лишь побочный эффект — соседний .eq() по uuid-колонке
 * падал на касте. Такую защиту нельзя оставлять неявной.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function clearAllPinLocks(childId: string): Promise<void> {
  if (!UUID_RE.test(childId)) {
    console.warn('[pinRateLimit.clearAllPinLocks] отклонён невалидный childId');
    return;
  }
  try {
    const db = createAdminClient();
    await Promise.all([
      db.from('auth_rate_limits').delete().eq('key', globalKey(childId)),
      db.from('auth_rate_limits').delete().like('key', `pin:${childId}:%`),
    ]);
  } catch (e) {
    console.warn('[pinRateLimit.clearAllPinLocks]', e);
  }
}

/** Сбросить счётчики (после успешного входа) — оба ключа. */
export async function clearPinAttempts(childId: string, ip: string): Promise<void> {
  try {
    const db = createAdminClient();
    await Promise.all([
      db.rpc('rate_limit_clear', { p_key: key(childId, ip) }),
      db.rpc('rate_limit_clear', { p_key: globalKey(childId) }),
    ]);
  } catch (e) {
    console.warn('[pinRateLimit.clearPinAttempts]', e);
  }
}
