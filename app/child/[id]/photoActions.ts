'use server';

import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyChildSession } from '@/lib/childSession';

const ACTIVE_CHILD_COOKIE = 'pip_active_child';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type UploadResult = { ok: true; path: string } | { ok: false; error: string };

/**
 * Авторизация ребёнка — два режима (как в markTaskComplete/orderReward).
 * Возвращает admin-клиент (обходит RLS) и familyId.
 */
async function resolveChildAuth(childId: string): Promise<
  | { ok: true; adminDb: ReturnType<typeof createAdminClient>; familyId: string }
  | { ok: false; error: string }
> {
  const cookieStore = await cookies();
  const adminDb = createAdminClient();

  const directToken = cookieStore.get('pip_child_direct')?.value;
  const directSession = directToken ? verifyChildSession(directToken) : null;
  if (directSession && directSession.childId === childId) {
    return { ok: true, adminDb, familyId: directSession.familyId };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const activeChild = cookieStore.get(ACTIVE_CHILD_COOKIE)?.value;
  if (!activeChild || activeChild !== childId) {
    return { ok: false, error: 'Сначала зайди в режим ребёнка по PIN' };
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('user_id', user.id)
    .single();
  if (!me?.family_id) return { ok: false, error: 'Профиль родителя не найден' };

  const { data: child } = await adminDb
    .from('profiles')
    .select('family_id, role')
    .eq('id', childId)
    .single();
  if (child?.role !== 'child' || child.family_id !== me.family_id) {
    return { ok: false, error: 'Ребёнок не из вашей семьи' };
  }

  return { ok: true, adminDb, familyId: me.family_id };
}

/**
 * Загрузка фото-доказательства задачи.
 *
 * Раньше загрузка шла напрямую из браузера anon-клиентом (без Supabase-сессии),
 * из-за чего у ребёнка, вошедшего по PIN, она падала (RLS бакета task-photos
 * требует authenticated). Теперь грузим серверно через admin-клиент, авторизуя
 * ребёнка по pip_child_direct (или родителя по pip_active_child).
 *
 * Bucket: task-photos (приватный). Path: {family_id}/{uuid}.{ext}
 */
export async function uploadTaskPhoto(formData: FormData): Promise<UploadResult> {
  const childId = String(formData.get('childId') || '');
  const file = formData.get('file');

  if (!childId || !(file instanceof File)) {
    return { ok: false, error: 'Файл не передан' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'Файл слишком большой — максимум 5 МБ' };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: 'Поддерживаются только JPEG, PNG, WebP' };
  }

  const auth = await resolveChildAuth(childId);
  if (!auth.ok) return auth;
  const { adminDb, familyId } = auth;

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${familyId}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await adminDb.storage
    .from('task-photos')
    .upload(path, bytes, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    console.error('[uploadTaskPhoto]', error);
    return { ok: false, error: 'Не получилось загрузить фото. Попробуй ещё раз.' };
  }

  return { ok: true, path };
}
