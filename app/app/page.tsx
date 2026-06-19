import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Точка входа в ПРИЛОЖЕНИЕ (отдельно от маркетингового лендинга на «/»).
 *
 * Сюда стартует установленный PWA / приложение из RuStore (manifest start_url =
 * /app, TWA startUrl = /app). Маркетинг здесь не показывается:
 *   • авторизован → его раздел (родитель/ребёнок);
 *   • не авторизован → экран входа.
 *
 * Так приложение открывается сразу в функционал и воспринимается как
 * самостоятельный продукт (требование модерации RuStore), а лендинг живёт
 * отдельно на «/» для браузера/SEO/рекламы.
 */
export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AppEntry() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  redirect(profile?.role === 'child' ? '/child' : '/parent');
}
