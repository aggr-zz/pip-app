'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { applyInviteForUser } from '@/lib/invites';

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Сначала войди в аккаунт' };

  const result = await applyInviteForUser(user.id, token);
  if (result.ok) revalidatePath('/parent');
  return result;
}

// ─── Получить публичную инфо об инвайте (для страницы invite-family) ─────────

export async function getInviteInfo(token: string): Promise<{
  valid: boolean;
  expired?: boolean;
  used?: boolean;
  familyName?: string;
  inviterName?: string;
  /** Залогиненный зритель уже состоит в этой семье (показываем «это твоя семья»). */
  alreadyMember?: boolean;
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

  // Шаг 2: имя пригласившего, название семьи + проверка членства зрителя — параллельно
  const supabase = await createClient();
  const [{ data: inviter }, { data: family }, { data: { user } }] = await Promise.all([
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
    supabase.auth.getUser(),
  ]);

  let alreadyMember = false;
  if (user) {
    const { data: me } = await admin
      .from('profiles')
      .select('family_id')
      .eq('user_id', user.id)
      .single<{ family_id: string }>();
    alreadyMember = me?.family_id === invite.family_id;
  }

  return {
    valid: true,
    familyName: family?.name ?? 'Наша семья',
    inviterName: inviter?.name ?? 'Родитель',
    alreadyMember,
  };
}
