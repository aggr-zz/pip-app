/**
 * Ограничение попыток ввода PIN ребёнка — защита от перебора.
 *
 * PIN всего 4 цифры (10 000 комбинаций), а childId виден в публичной
 * ссылке /join/[childId], поэтому без лимита PIN перебирается за минуты.
 *
 * Реализация — in-memory на один процесс (приложение крутится одним
 * `next start` на VPS). При переходе на несколько инстансов вынести
 * в Redis/БД (общий стор между процессами).
 */

const MAX_ATTEMPTS = 5;            // после стольких неудач — лок
const LOCK_MS      = 15 * 60_000;  // на 15 минут
const WINDOW_MS    = 15 * 60_000;  // окно подсчёта неудач

interface Entry {
  fails: number;
  first: number;       // начало текущего окна
  lockedUntil: number; // 0 если не заблокирован
}

const store = new Map<string, Entry>();

/** Заблокирован ли ключ сейчас. key — обычно childId. */
export function isPinLocked(key: string): { locked: boolean; retryAfterSec: number } {
  const e = store.get(key);
  if (e && e.lockedUntil > Date.now()) {
    return { locked: true, retryAfterSec: Math.ceil((e.lockedUntil - Date.now()) / 1000) };
  }
  return { locked: false, retryAfterSec: 0 };
}

/** Зафиксировать неудачную попытку; при достижении лимита — выставить лок. */
export function recordPinFailure(key: string): void {
  const now = Date.now();
  let e = store.get(key);
  if (!e || now - e.first > WINDOW_MS) {
    e = { fails: 0, first: now, lockedUntil: 0 };
  }
  e.fails += 1;
  if (e.fails >= MAX_ATTEMPTS) {
    e.lockedUntil = now + LOCK_MS;
    e.fails = 0;
    e.first = now;
  }
  store.set(key, e);
}

/** Сбросить счётчик (после успешного входа). */
export function clearPinAttempts(key: string): void {
  store.delete(key);
}
