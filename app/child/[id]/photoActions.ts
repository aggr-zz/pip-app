'use server';

import { randomUUID } from 'crypto';
import { Buffer } from 'node:buffer';
import { resolveChildAuth } from '@/lib/childAuth';
import { sniffImageType } from '@/lib/imageSniff';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type UploadResult = { ok: true; path: string } | { ok: false; error: string };

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

  // Тип — по СОДЕРЖИМОМУ, а не по клиентским file.type/file.name: и то и другое
  // подделывается. Проверка ALLOWED_TYPES выше — лишь дешёвый ранний отсев.
  // Тот же подход, что в uploadChildAvatar (lib/imageSniff).
  const bytes = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffImageType(new Uint8Array(bytes));
  if (!sniffed) {
    return { ok: false, error: 'Файл не похож на изображение (JPEG, PNG или WebP)' };
  }

  const path = `${familyId}/${randomUUID()}.${sniffed.ext}`;

  const { error } = await adminDb.storage
    .from('task-photos')
    .upload(path, bytes, {
      cacheControl: '3600',
      upsert: false,
      contentType: sniffed.mime,
    });

  if (error) {
    console.error('[uploadTaskPhoto]', error);
    return { ok: false, error: 'Не получилось загрузить фото. Попробуй ещё раз.' };
  }

  return { ok: true, path };
}
