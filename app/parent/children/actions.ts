'use server';

import { cookies, headers } from 'next/headers';
import { Buffer } from 'node:buffer';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyChildSession } from '@/lib/childSession';
import { resolveChildAuth } from '@/lib/childAuth';
import { sniffImageType } from '@/lib/imageSniff';
import { isPinLocked, recordPinFailure, clearPinAttempts, clearAllPinLocks } from '@/lib/pinRateLimit';
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
  /** Согласие родителя на обработку данных ребёнка (App Store 5.1.4). */
  parentalConsent?: boolean;
}): Promise<Result<{ id: string }>> {
  // Проверяем на сервере: клиентский чекбокс сам по себе ничего не гарантирует.
  if (!input.parentalConsent) {
    return { ok: false, error: 'Нужно согласие родителя на обработку данных ребёнка' };
  }

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

  // Профиль родителя нужен, чтобы зафиксировать, КТО дал согласие (5.1.4).
  const { data: parentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

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
      // Фиксируем факт согласия: кто и когда. Не «галочка», а доказуемая запись.
      parental_consent_at: new Date().toISOString(),
      parental_consent_by: parentProfile?.id ?? null,
      parental_consent_source: 'explicit_checkbox',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[addChild]', error);
    return { ok: false, error: 'Не получилось добавить ребёнка' };
  }

  // Первому ребёнку назначаем стартовые задания — те, что seed_starter_content
  // создал при регистрации с assigned_to = '{}' (иначе они «висят» неназначенными
  // и ребёнок их не видит → аккаунт кажется пустым). Так у ребёнка сразу есть что
  // делать, а родитель видит живой пример, который можно отредактировать/удалить.
  // Только для ПЕРВОГО ребёнка; ошибки здесь не должны ломать создание ребёнка.
  try {
    const admin = createAdminClient();
    const { count: childCount } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', parent.family_id)
      .eq('role', 'child')
      .is('archived_at', null);
    if ((childCount ?? 0) === 1) {
      const { data: familyTasks } = await admin
        .from('tasks')
        .select('id, assigned_to')
        .eq('family_id', parent.family_id)
        .is('archived_at', null);
      const unassignedIds = (familyTasks ?? [])
        .filter((t) => !t.assigned_to || t.assigned_to.length === 0)
        .map((t) => t.id);
      if (unassignedIds.length > 0) {
        await admin
          .from('tasks')
          .update({ assigned_to: [newChild.id] })
          .in('id', unassignedIds);
      }
    }
  } catch (e) {
    console.warn('[addChild] starter-task assign failed:', e);
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

  // Пессимистичный счёт: фиксируем попытку ДО сравнения PIN — иначе между
  // isPinLocked и записью неудачи остаётся окно, в котором волна параллельных
  // запросов проходит целиком и обходит лимит. Ставим здесь, а не в начале
  // функции: иначе родитель с истёкшей сессией залочил бы вход ребёнку, ни разу
  // не ошибившись PIN-ом. Окно TOCTOU при этом всё равно закрыто — запись идёт
  // раньше сравнения. При успехе счётчик обнуляется ниже.
  await recordPinFailure(input.childId, ip);

  if (child.pin !== input.pin) {
    return { ok: false, error: 'Неверный PIN' };
  }

  // Успех — обнуляем счётчики (в т.ч. только что записанную попытку).
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

  // ── Режим 2: прямая сессия ребёнка ──────────────────────────────────────
  // Через resolveChildAuth: подписи токена мало (живёт 30 дней) — профиль
  // сверяется с БД, иначе архивированный ребёнок продолжал бы менять аватар.
  const directToken = cookieStore.get('pip_child_direct')?.value;
  const directSession = directToken ? verifyChildSession(directToken) : null;
  if (directSession && directSession.childId === input.profileId) {
    const auth = await resolveChildAuth(input.profileId);
    if (!auth.ok || auth.mode !== 'direct') {
      return { ok: false, error: auth.ok ? 'Доступ запрещён' : auth.error };
    }
    const { error } = await auth.adminDb
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
    // Сверяем профиль с БД (жив, не архивирован) — подписи токена мало.
    const auth = await resolveChildAuth(profileId);
    if (!auth.ok || auth.mode !== 'direct') {
      return { ok: false, error: auth.ok ? 'Доступ запрещён' : auth.error };
    }
    familyId = auth.familyId;
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

  // Тип определяем по СОДЕРЖИМОМУ (magic bytes), а не по клиентским file.type/file.name:
  // и то и другое подделывается, а файл потом лежит в публичном бакете и отдаётся
  // с заявленным content-type.
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImageType(bytes);
  if (!sniffed) {
    return { ok: false, error: 'Файл не похож на изображение (jpg, png или webp)' };
  }
  const path = `${familyId}/${profileId}.${sniffed.ext}`;

  const { error } = await admin.storage
    .from('avatars')
    .upload(path, bytes, { upsert: true, contentType: sniffed.mime });
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
  // .select().maybeSingle() — ОБЯЗАТЕЛЬНО: при 0 обновлённых строк (чужой childId)
  // PostgREST возвращает 204 и error === null. Без проверки факта обновления
  // снятие локов ниже выполнялось бы и для ЧУЖОГО ребёнка: атакующий с любым
  // родительским аккаунтом брал бы публичный childId из /join-ссылки, перебирал
  // PIN, а по достижении лока сбрасывал его этим вызовом — лимитер превращался
  // в отключаемый по запросу.
  const { data: updated, error } = await supabase
    .from('profiles')
    .update({ pin: input.pin })
    .eq('id', input.childId)
    .eq('family_id', auth.familyId)
    .eq('role', 'child')
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[resetChildPin]', error);
    return { ok: false, error: 'Не получилось сменить PIN' };
  }
  if (!updated) {
    // Ребёнок не найден в семье этого родителя — молча «успехом» не отвечаем.
    return { ok: false, error: 'Профиль не найден' };
  }

  // PIN действительно сменён для СВОЕГО ребёнка — снимаем все его локи перебора
  // (глобальный + все per-IP). Комментарий в lib/pinRateLimit обосновывает
  // глобальный лок тем, что «родитель может сбросить PIN» — но сброс лок не
  // снимал, и ребёнок не входил даже с новым PIN. Именно все: ребёнка лочит ЕГО
  // IP, а сбрасывает родитель со своего.
  await clearAllPinLocks(input.childId);

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
