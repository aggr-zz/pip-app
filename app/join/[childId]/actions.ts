'use server';

import { cookies, headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { signChildSession } from '@/lib/childSession';
import { isPinLocked, recordPinFailure, clearPinAttempts, clientIpFromHeaders } from '@/lib/pinRateLimit';

type Result<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };

/**
 * Верифицирует PIN ребёнка и выдаёт прямую детскую сессию.
 * Не требует родительской Supabase-авторизации.
 */
export async function joinAsChild(input: {
  childId: string;
  pin: string;
}): Promise<Result<{ childId: string }>> {
  if (!/^\d{4}$/.test(input.pin)) {
    return { ok: false, error: 'PIN — 4 цифры' };
  }

  const ip = clientIpFromHeaders(await headers());
  const lock = await isPinLocked(input.childId, ip);
  if (lock.locked) {
    return { ok: false, error: `Слишком много попыток. Попробуй через ${Math.ceil(lock.retryAfterSec / 60)} мин.` };
  }

  const supabase = createAdminClient();

  const { data: child, error } = await supabase
    .from('profiles')
    .select('id, family_id, pin, role, name, archived_at')
    .eq('id', input.childId)
    .single();

  if (error || !child) return { ok: false, error: 'Профиль не найден' };
  if (child.role !== 'child') return { ok: false, error: 'Это не детский профиль' };
  if (child.archived_at) return { ok: false, error: 'Профиль удалён' };
  if (child.pin !== input.pin) {
    recordPinFailure(input.childId);
    return { ok: false, error: 'Неверный PIN' };
  }

  clearPinAttempts(input.childId);
  const token = signChildSession(child.id, child.family_id);
  const cookieStore = await cookies();
  cookieStore.set('pip_child_direct', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 дней
    path: '/',
  });

  return { ok: true, childId: child.id };
}
