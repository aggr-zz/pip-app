/**
 * Ядро приёма семейного инвайта — на admin-клиенте, БЕЗ зависимости от текущей
 * Supabase-сессии. Это позволяет применять инвайт и из server action (по сессии),
 * и из роута /auth/confirm (по user.id из verifyOtp, когда cookie сессии ещё не
 * доступна в том же запросе).
 *
 * НЕ 'use server' — модуль не должен экспортировать вызываемые клиентом экшены
 * (иначе applyInviteForUser(userId,...) дал бы перенос любого юзера в семью).
 */

import { createAdminClient } from '@/lib/supabase/admin';

export type InviteResult = { ok: true } | { ok: false; error: string };

export async function applyInviteForUser(userId: string, token: string): Promise<InviteResult> {
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from('family_invites')
    .select('id, family_id, expires_at, used_at')
    .eq('token', token)
    .single<{ id: string; family_id: string; expires_at: string; used_at: string | null }>();

  if (!invite) return { ok: false, error: 'Ссылка недействительна' };
  if (invite.used_at) return { ok: false, error: 'Эта ссылка уже была использована' };
  if (new Date(invite.expires_at) < new Date()) {
    return { ok: false, error: 'Срок действия ссылки истёк' };
  }

  const { data: myProfile } = await admin
    .from('profiles')
    .select('id, family_id, role')
    .eq('user_id', userId)
    .single<{ id: string; family_id: string; role: string }>();

  if (!myProfile) return { ok: false, error: 'Профиль не найден' };

  // Уже в этой семье — ничего не делаем и НЕ помечаем инвайт used (иначе
  // пригласивший, открыв свою же ссылку, спалил бы её до второго родителя).
  if (myProfile.family_id === invite.family_id) {
    return { ok: true };
  }

  // Защита от потери данных: если у принимающего уже есть СВОЯ семья с другими
  // участниками (дети/второй родитель) — смена family_id осиротила бы их.
  const { count: otherMembers } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', myProfile.family_id)
    .neq('id', myProfile.id);

  if ((otherMembers ?? 0) > 0) {
    return {
      ok: false,
      error:
        'У тебя уже есть своя семья с участниками — если присоединиться, твои дети и данные пропадут. Объединение семей пока не поддерживается. Напиши нам, если нужно перенести аккаунт.',
    };
  }

  const oldFamilyId = myProfile.family_id;

  // Атомарно помечаем инвайт использованным (WHERE used_at IS NULL) — защита от
  // двойного принятия по гонке. Только победитель этого UPDATE применяет перенос.
  const { data: claimed } = await admin
    .from('family_invites')
    .update({ used_at: new Date().toISOString(), used_by: myProfile.id })
    .eq('id', invite.id)
    .is('used_at', null)
    .select('id');

  if (!claimed || claimed.length === 0) {
    return { ok: false, error: 'Эта ссылка уже была использована' };
  }

  const { error: updateError } = await admin
    .from('profiles')
    .update({ family_id: invite.family_id })
    .eq('id', myProfile.id);

  if (updateError) {
    console.error('[applyInviteForUser] update profile', updateError);
    return { ok: false, error: 'Не удалось присоединиться к семье' };
  }

  // Если старая семья опустела — удалить её.
  const { count } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', oldFamilyId);

  if (count === 0) {
    await admin.from('families').delete().eq('id', oldFamilyId);
  }

  return { ok: true };
}
