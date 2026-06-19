'use server';

import { cookies, headers } from 'next/headers';
import { Buffer } from 'node:buffer';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyChildSession } from '@/lib/childSession';
import { isPinLocked, recordPinFailure, clearPinAttempts } from '@/lib/pinRateLimit';
import { clientIpFromHeaders } from '@/lib/pinRateLimit';
import type { AvatarColor } from './constants';

// ─── Константы ────────────────────────────────────────────────────────
const COOKIE_NAME = 'pip_active_child';
const COOKIE_TTL_SEC = 60 * 60; // 1 час, потом снова PIN

const AVATAR_COLORS_VALID = ['coral', 'mint', 'ink', 'gold', 'rose', 'sky'] as const;

type Result<T = Record<string, never>> =
  | ({ ok: true } & T)
  | { ok: false; error: string };


// ─── ADD CHILD ────────────────────────────────────────────────────────
// Создаёт детский профиль в семье родителя.
// В MVP ребёнок = PIN-профиль без своего auth.user (решение A3).
export async function addChild(input: {
  name: string;
  age: number | null;
  color: AvatarColor;
  emoji?: string;
  pin: string;
}): Promise<Result<{ id: string }>> {
  const name = (input.name ?? '').trim();
  if (!name) return { ok: false, error: 'Введи имя' };
  if (name.length > 50) return { ok: false, error: 'Имя слишком длинное (макс 50 символов)' };
  if (!AVATAR_COLORS_VALID.includes(input.color as typeof AVATAR_COLORS_VALID[number])) return { ok: false, error: 'Неверный цвет' };
  if (!/^\d{4}$/.test(input.pin)) return { ok: false, error: 'PIN должен быть из 4 цифр' };
  if (input.age !== null && (input.age < 1 || input.age > 17)) {
    return { ok: false, error: 'Возраст должен быть от 1 до 17' };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  // Проверка что текущий пользователь — родитель
  const { data: parent } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!parent || parent.role !== 'parent') {
    return { ok: false, error: 'Только родитель может добавлять детей' };
  }

  const birthYear = input.age !== null ? new Date().getFullYear() - input.age : null;

  const { data: newChild, error } = await supabase
    .from('profiles')
    .insert({
      family_id: parent.family_id,
      user_id: null, // важно: у ребёнка нет своего auth.user
      role: 'child',
      name,
      birth_year: birthYear,
      avatar_color: input.color,
      avatar_emoji: input.emoji ?? null,
      pin: input.pin,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[addChild]', error);
    return { ok: false, error: 'Не получилось добавить ребёнка' };
  }

  revalidatePath('/parent');
  return { ok: true, id: newChild.id };
}


// ─── ENTER CHILD MODE ─────────────────────────────────────────────────
// Проверяет PIN, ставит cookie. На час открывает доступ к /child/[id].
// Auth-сессия Supabase остаётся родительской.
export async function enterChildMode(input: {
  childId: string;
  pin: string;
}): Promise<Result> {
  if (!/^\d{4}$/.test(input.pin)) {
    return { ok: false, error: 'PIN должен быть из 4 цифр' };
  }

  const ip = clientIpFromHeaders(await headers());
  const lock = await isPinLocked(input.childId, ip);
  if (lock.locked) {
    return { ok: false, error: `Слишком много попыток. Попробуй через ${Math.ceil(lock.retryAfterSec / 60)} мин.` };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: parent } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!parent || parent.role !== 'parent') {
    return { ok: false, error: 'Только родитель' };
  }

  const { data: child } = await supabase
    .from('profiles')
    .select('id, family_id, pin')
    .eq('id', input.childId)
    .single();

  if (!child || child.family_id !== parent.family_id) {
    return { ok: false, error: 'Профиль не найден' };
  }

  if (child.pin !== input.pin) {
    await recordPinFailure(input.childId, ip);
    return { ok: false, error: 'Неверный PIN' };
  }

  await clearPinAttempts(input.childId, ip);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, input.childId, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_TTL_SEC,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  return { ok: true };
}


// ─── EXIT CHILD MODE ──────────────────────────────────────────────────
export async function exitChildMode(): Promise<Result> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return { ok: true };
}


// ─── GET ACTIVE CHILD ID ──────────────────────────────────────────────
// Для server-компонентов в /child/[id].
export async function getActiveChildId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}


// ─── UPDATE CHILD AVATAR ──────────────────────────────────────────────
// Меняет аватар ребёнка: фото / эмодзи / цвет.
// Поддерживает два режима:
//   1. Родитель (Supabase-сессия) — может менять аватар любого ребёнка семьи
//   2. Ребёнок напрямую (pip_child_direct) — только свой профиль
export async function updateChildAvatar(input: {
  profileId: string;
  avatarUrl: string | null;
  avatarEmoji: string | null;
  avatarColor: string;
}): Promise<Result> {
  const validColors = ['coral', 'mint', 'ink', 'gold', 'rose', 'sky'];
  if (!validColors.includes(input.avatarColor)) {
    return { ok: false, error: 'Неверный цвет' };
  }

  const cookieStore = await cookies();

  // ── Режим 2: прямая сессия ребёнка (только если токен валиден; иначе — в родительский режим) ──
  const directToken = cookieStore.get('pip_child_direct')?.value;
  const directSession = directToken ? verifyChildSession(directToken) : null;
  if (directSession && directSession.childId === input.profileId) {
    const admin = createAdminClient();
    const { error } = await admin
      .from('profiles')
      .update({
        avatar_url:   input.avatarUrl,
        avatar_emoji: input.avatarEmoji,
        avatar_color: input.avatarColor,
      })
      .eq('id', input.profileId);

    if (error) {
      console.error('[updateChildAvatar direct]', error);
      return { ok: false, error: 'Не получилось обновить аватар' };
    }

    revalidatePath(`/child/${input.profileId}`);
    return { ok: true };
  }

  // ── Режим 1: родительская Supabase-сессия ─────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') {
    return { ok: false, error: 'Только родитель может менять аватар' };
  }

  const { data: child } = await supabase
    .from('profiles')
    .select('id, family_id, role')
    .eq('id', input.profileId)
    .single();

  if (!child || child.family_id !== me.family_id || child.role !== 'child') {
    return { ok: false, error: 'Профиль не найден' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url:   input.avatarUrl,
      avatar_emoji: input.avatarEmoji,
      avatar_color: input.avatarColor,
    })
    .eq('id', input.profileId);

  if (error) {
    console.error('[updateChildAvatar]', error);
    return { ok: false, error: 'Не получилось обновить аватар' };
  }

  revalidatePath('/parent');
  revalidatePath(`/parent/children/${input.profileId}`);
  revalidatePath(`/child/${input.profileId}`);
  return { ok: true };
}


// ─── UPLOAD CHILD AVATAR (M19) ────────────────────────────────────────
// Загрузка фото-аватара через admin-клиент. Раньше AvatarPicker грузил из
// браузера anon-клиентом — у ребёнка по PIN нет Supabase-сессии и запись в
// бакет могла падать. Авторизация дуальная: прямой ребёнок (свой профиль) или
// родитель семьи.
export async function uploadChildAvatar(formData: FormData): Promise<Result<{ url: string }>> {
  const profileId = String(formData.get('profileId') || '');
  const file = formData.get('file');
  if (!profileId || !(file instanceof File)) return { ok: false, error: 'Файл не передан' };
  if (file.size > 2 * 1024 * 1024) return { ok: false, error: 'Файл слишком большой. Максимум 2 МБ.' };
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return { ok: false, error: 'Поддерживаются только JPEG, PNG, WebP' };
  }

  const cookieStore = await cookies();
  const admin = createAdminClient();
  let familyId: string | null = null;

  const directToken = cookieStore.get('pip_child_direct')?.value;
  const directSession = directToken ? verifyChildSession(directToken) : null;
  if (directSession && directSession.childId === profileId) {
    familyId = directSession.familyId;
  } else {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Не авторизован' };
    const { data: me } = await supabase
      .from('profiles').select('family_id, role').eq('user_id', user.id).single();
    if (!me || me.role !== 'parent') return { ok: false, error: 'Только родитель может менять аватар' };
    const { data: child } = await admin
      .from('profiles').select('family_id, role').eq('id', profileId).single();
    if (child?.role !== 'child' || child.family_id !== me.family_id) {
      return { ok: false, error: 'Профиль не найден' };
    }
    familyId = me.family_id;
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${familyId}/${profileId}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await admin.storage
    .from('avatars')
    .upload(path, bytes, { upsert: true, contentType: file.type });
  if (error) {
    console.error('[uploadChildAvatar]', error);
    return { ok: false, error: 'Не получилось загрузить фото. Попробуй ещё раз.' };
  }

  const { data: urlData } = admin.storage.from('avatars').getPublicUrl(path);
  return { ok: true, url: `${urlData.publicUrl}?t=${Date.now()}` };
}


// ─── PARENT GUARD (для M17) ───────────────────────────────────────────
// Возвращает family_id родителя или ошибку. Только для родителя.
async function requireParentFamily(): Promise<
  | { ok: true; familyId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };
  const { data: me } = await supabase
    .from('profiles').select('family_id, role').eq('user_id', user.id).single();
  if (!me || me.role !== 'parent') return { ok: false, error: 'Только родитель' };
  return { ok: true, familyId: me.family_id };
}


// ─── EDIT CHILD (M17) — имя и возраст ─────────────────────────────────
export async function editChild(input: {
  childId: string;
  name: string;
  age: number | null;
}): Promise<Result> {
  const name = (input.name ?? '').trim();
  if (!name) return { ok: false, error: 'Введи имя' };
  if (name.length > 50) return { ok: false, error: 'Имя слишком длинное (макс 50 символов)' };
  if (input.age !== null && (input.age < 1 || input.age > 17)) {
    return { ok: false, error: 'Возраст должен быть от 1 до 17' };
  }

  const auth = await requireParentFamily();
  if (!auth.ok) return auth;

  const birthYear = input.age !== null ? new Date().getFullYear() - input.age : null;

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ name, birth_year: birthYear })
    .eq('id', input.childId)
    .eq('family_id', auth.familyId)
    .eq('role', 'child');

  if (error) {
    console.error('[editChild]', error);
    return { ok: false, error: 'Не получилось сохранить' };
  }

  revalidatePath('/parent');
  revalidatePath(`/parent/children/${input.childId}`);
  return { ok: true };
}


// ─── RESET CHILD PIN (M17) ────────────────────────────────────────────
export async function resetChildPin(input: { childId: string; pin: string }): Promise<Result> {
  if (!/^\d{4}$/.test(input.pin)) return { ok: false, error: 'PIN должен быть из 4 цифр' };

  const auth = await requireParentFamily();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ pin: input.pin })
    .eq('id', input.childId)
    .eq('family_id', auth.familyId)
    .eq('role', 'child');

  if (error) {
    console.error('[resetChildPin]', error);
    return { ok: false, error: 'Не получилось сменить PIN' };
  }

  revalidatePath(`/parent/children/${input.childId}`);
  return { ok: true };
}


// ─── ARCHIVE CHILD (M17) — мягкое удаление ────────────────────────────
// Выборки детей фильтруют archived_at IS NULL, поэтому профиль скрывается
// из дашборда и назначения задач, но данные (история/баланс) сохраняются.
export async function archiveChild(input: { childId: string }): Promise<Result> {
  const auth = await requireParentFamily();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', input.childId)
    .eq('family_id', auth.familyId)
    .eq('role', 'child');

  if (error) {
    console.error('[archiveChild]', error);
    return { ok: false, error: 'Не получилось архивировать' };
  }

  revalidatePath('/parent');
  revalidatePath(`/parent/children/${input.childId}`);
  return { ok: true };
}
