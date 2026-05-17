import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Защита роута /admin/*.
 *
 * Возвращает Supabase-клиент и user, если пользователь авторизован И есть
 * в таблице admins. Иначе редиректит:
 *   - не залогинен → /login?next=/admin
 *   - залогинен, но не админ → /parent (тихий редирект без раскрытия что есть /admin)
 *
 * Использование в каждой странице /admin/*:
 *
 *   const { supabase, user } = await requireAdmin('/admin/families');
 */
export async function requireAdmin(currentPath: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(currentPath)}`);
  }

  const { data: isAdmin, error } = await supabase.rpc('is_current_user_admin');
  if (error) {
    console.error('[requireAdmin] RPC failed:', error);
    redirect('/parent');
  }
  if (!isAdmin) {
    redirect('/parent');
  }

  return { supabase, user };
}
