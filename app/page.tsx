import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Не залогинен → на логин
  if (!user) {
    redirect('/login');
  }

  // Определяем роль из profiles и редиректим в соответствующий раздел.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role === 'child') {
    redirect('/child');
  }

  // По умолчанию (родитель) — на дашборд
  redirect('/parent');
}
