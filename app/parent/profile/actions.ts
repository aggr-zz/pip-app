'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Result = { ok: true; mode: string } | { ok: false; error: string };

const AVATARS = 'avatars';
const TASK_PHOTOS = 'task-photos';

/**
 * Полное удаление аккаунта родителя ИЗНУТРИ приложения (App Store 5.1.1(v))
 * + гигиена детских данных.
 *
 * ПОРЯДОК КРИТИЧЕН И ОБРАТЕН ИНТУИЦИИ:
 *   1. СОБРАТЬ пути файлов (ничего не удаляя),
 *   2. удалить данные в БД (RPC — транзакция, откатывается),
 *   3. и только теперь удалить файлы (Storage НЕ транзакционен и НЕ откатывается).
 * Если сделать наоборот, падение RPC оставит семью с живыми данными и уже
 * уничтоженными фото — необратимо.
 *
 * Единственный источник истины про «снесли семью или только профиль» — mode из RPC.
 * Локально это НЕ пересчитываем: два источника истины разъезжаются при сбоях.
 *
 * Идемпотентно: если профиля уже нет (повтор после частичного отказа), просто
 * добиваем удаление auth-пользователя.
 */
export async function deleteMyAccount(): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const admin = createAdminClient();

  // maybeSingle, а не single: отсутствие профиля — законный случай (повтор).
  const { data: me, error: meErr } = await admin
    .from('profiles')
    .select('id, family_id, role')
    .eq('user_id', user.id)
    .maybeSingle();

  if (meErr) {
    console.error('[deleteMyAccount] profile lookup:', meErr.message);
    return { ok: false, error: 'Не удалось прочитать профиль. Попробуйте ещё раз.' };
  }

  // Данных уже нет, а учётка жива → доводим до конца, а не отвечаем «не найдено».
  if (!me) {
    const failed = await deleteUserWithRetry(admin, user.id);
    if (failed) return { ok: false, error: 'Не удалось убрать учётную запись. Попробуйте ещё раз.' };
    return { ok: true, mode: 'user_only' };
  }

  if (me.role !== 'parent') {
    return { ok: false, error: 'Удаление доступно только родителю' };
  }

  // ── 1. Только СОБИРАЕМ пути. Оба бакета разложены по префиксу family_id,
  //       поэтому префиксный обход заодно ловит осиротевшие загрузки (фото,
  //       залитое без создания task_completion).
  let avatarPaths: string[] = [];
  let photoPaths: string[] = [];
  try {
    avatarPaths = await listAllPaths(admin, AVATARS, me.family_id);
    photoPaths = await listAllPaths(admin, TASK_PHOTOS, me.family_id);
  } catch (e) {
    console.error('[deleteMyAccount] list storage:', e);
    return { ok: false, error: 'Не удалось прочитать файлы. Данные не тронуты, попробуйте ещё раз.' };
  }

  // ── 2. Данные в БД (транзакция; при ошибке — ничего не потеряно)
  const { data: rpcRes, error: rpcErr } = await admin.rpc('delete_parent_account', {
    p_user_id: user.id,
  });
  if (rpcErr) {
    console.error('[deleteMyAccount] rpc:', rpcErr.message);
    return { ok: false, error: 'Не удалось удалить данные аккаунта' };
  }
  const res = rpcRes as { ok?: boolean; mode?: string; error?: string } | null;
  if (!res?.ok) {
    console.error('[deleteMyAccount] rpc returned:', res);
    return { ok: false, error: res?.error || 'Не удалось удалить данные аккаунта' };
  }

  // ── 3. Файлы — только если семья действительно снесена (mode из RPC).
  //       Данные уже удалены, откатывать нечего: чистим best-effort и громко
  //       логируем, что осталось, чтобы можно было добить руками.
  if (res.mode === 'family_deleted') {
    await removeAllLogging(admin, AVATARS, avatarPaths);
    await removeAllLogging(admin, TASK_PHOTOS, photoPaths);
  }

  // ── 4. Сам auth-пользователь (с ретраем: иначе юзер застрянет «без данных, но с учёткой»)
  const failed = await deleteUserWithRetry(admin, user.id);
  if (failed) {
    console.error('[deleteMyAccount] ORPHAN AUTH USER — требует ручного удаления:', user.id);
    return { ok: false, error: 'Данные удалены, но учётную запись убрать не вышло. Попробуйте ещё раз.' };
  }

  return { ok: true, mode: res.mode ?? 'deleted' };
}

/** Полный обход префикса с пагинацией: list() отдаёт максимум страницу за раз. */
async function listAllPaths(
  admin: SupabaseClient,
  bucket: string,
  prefix: string,
): Promise<string[]> {
  const paths: string[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset });
    if (error) throw new Error(`${bucket}: ${error.message}`);
    if (!data?.length) break;
    for (const f of data) paths.push(`${prefix}/${f.name}`);
    if (data.length < pageSize) break;
  }
  return paths;
}

/** remove() возвращает { error }, а не бросает — проверяем и логируем несделанное. */
async function removeAllLogging(
  admin: SupabaseClient,
  bucket: string,
  paths: string[],
): Promise<void> {
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100);
    const { error } = await admin.storage.from(bucket).remove(chunk);
    if (error) {
      console.error(`[deleteMyAccount] ORPHAN FILES в ${bucket} — не удалены:`, chunk.join(', '), error.message);
    }
  }
}

async function deleteUserWithRetry(admin: SupabaseClient, userId: string): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (!error) return false;
    console.warn(`[deleteMyAccount] deleteUser попытка ${attempt}:`, error.message);
    if (attempt < 3) await new Promise((r) => setTimeout(r, 300 * attempt));
  }
  return true;
}
