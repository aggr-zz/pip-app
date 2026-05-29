'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type Result = { ok: true } | { ok: false; error: string };

// ─── Создать инвайт (вызывается первым родителем) ────────────────────────────

export async function createFamilyInvite(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Не авторизован' };

  const { data: me } = await supabase
    .from('profiles')
    .select('id, family_id, role')
    .eq('user_id', user.id)
    .single<{ id: string; family_id: string; role: string }>();

  if (!me || me.role !== 'parent') return { ok: false, error: 'Только для родителей' };

  // Генерируем криптографически безопасный токен (48 hex-символов)
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const admin = createAdminClient();
  const { error } = await admin.from('family_invites').insert({
    family_id: me.family_id,
    created_by: me.id,
    token,
  });

  if (error) {
    console.error('[createFamilyInvite]', error);
    return { ok: false, error: 'Не удалось создать ссылку' };
  }

  return { ok: true, token };
}

// ─── Принять инвайт (вызывается вторым родителем) ────────────────────────────

export async function acceptFamilyInvite(token: string): Promise<Result> {
  const admin = createAdminClient();

  // 1. Найти и проверить инвайт
  const { data: invite } = await admin
    .from('family_invites')
    .select('id, family_id, expires_at, used_at')
    .eq('token', token)
    .single<{
      id: string;
      family_id: string;
      expires_at: string;
      used_at: string | null;
    }>();

  if (!invite) return { ok: false, error: 'Ссылка недействительна' };
  if (invite.used_at) return { ok: false, error: 'Эта ссылка уже была использована' };
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false, error: 'Срок действия ссылки истёк' };
  }

  // 2. Получить текущего юзера
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Сначала войди в аккаунт' };

  // 3. Найти профиль юзера (мог быть создан триггером при регистрации)
  const { data: myProfile } = await admin
    .from('profiles')
    .select('id, family_id, role')
    .eq('user_id', user.id)
    .single<{ id: string; family_id: string; role: string }>();

  if (!myProfile) return { ok: false, error: 'Профиль не найден' };

  // Если уже в этой семье — ничего делать не нужно
  if (myProfile.family_id === invite.family_id) {
    return { ok: true };
  }

  // Запоминаем старую family_id чтобы потом попробовать убрать пустую семью
  const oldFamilyId = myProfile.family_id;

  // 4. Обновить family_id профиля
  const { error: updateError } = await admin
    .from('profiles')
    .update({ family_id: invite.family_id })
    .eq('id', myProfile.id);

  if (updateError) {
    console.error('[acceptFamilyInvite] update profile', updateError);
    return { ok: false, error: 'Не удалось присоединиться к семье' };
  }

  // 5. Пометить инвайт как использованный
  await admin
    .from('family_invites')
    .update({ used_at: new Date().toISOString(), used_by: myProfile.id })
    .eq('id', invite.id);

  // 6. Если старая семья опустела (нет других профилей) — удалить её
  const { count } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', oldFamilyId);

  if (count === 0) {
    await admin.from('families').delete().eq('id', oldFamilyId);
  }

  revalidatePath('/parent');
  return { ok: true };
}

// ─── Получить публичную инфо об инвайте (для страницы invite-family) ─────────

export async function getInviteInfo(token: string): Promise<{
  valid: boolean;
  expired?: boolean;
  used?: boolean;
  familyName?: string;
  inviterName?: string;
}> {
  const admin = createAdminClient();

  // Шаг 1: получаем invite без join (надёжнее)
  const { data: invite } = await admin
    .from('family_invites')
    .select('expires_at, used_at, family_id, created_by')
    .eq('token', token)
    .single<{
      expires_at: string;
      used_at: string | null;
      family_id: string;
      created_by: string;
    }>();

  if (!invite) return { valid: false };
  if (invite.used_at) return { valid: false, used: true };
  if (new Date(invite.expires_at) < new Date()) return { valid: false, expired: true };

  // Шаг 2: имя пригласившего и название семьи — параллельно
  const [{ data: inviter }, { data: family }] = await Promise.all([
    admin
      .from('profiles')
      .select('name')
      .eq('id', invite.created_by)
      .single<{ name: string }>(),
    admin
      .from('families')
      .select('name')
      .eq('id', invite.family_id)
      .single<{ name: string }>(),
  ]);

  return {
    valid: true,
    familyName: family?.name ?? 'Наша семья',
    inviterName: inviter?.name ?? 'Родитель',
  };
}
