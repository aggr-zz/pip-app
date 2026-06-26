import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ParentTabBar } from './ParentTabBar';
import { SignOutButton } from './SignOutButton';
import { autoApproveSweep } from './approvals/actions';

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  // Профиля нет (или это не родитель) — НЕ редиректим на «/», иначе возникает
  // петля «/» → «/parent» → «/» (ERR_TOO_MANY_REDIRECTS) у залогиненного юзера
  // без профиля (напр. если триггер handle_new_user не сработал). Показываем
  // терминальный экран с возможностью выйти — петля разрывается.
  if (!me || me.role !== 'parent') {
    return (
      <main
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 32,
          textAlign: 'center',
          background: '#ECEEF6',
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1C2742', margin: 0 }}>Профиль не найден</h1>
        <p style={{ fontSize: 15, color: '#5A6178', maxWidth: 320, margin: 0 }}>
          Не удалось загрузить семейный профиль. Выйдите и войдите снова — если повторяется, напишите нам.
        </p>
        <div style={{ width: '100%', maxWidth: 280 }}>
          <SignOutButton fullWidth />
        </div>
      </main>
    );
  }

  // Автоаппрув просроченных заявок (идемпотентен) + список детей — параллельно.
  const [, { data: children_ }] = await Promise.all([
    autoApproveSweep(),
    supabase
      .from('profiles')
      .select('id')
      .eq('family_id', me.family_id)
      .eq('role', 'child')
      .is('archived_at', null),
  ]);

  const childIds = (children_ ?? []).map((c) => c.id);

  let pendingCount = 0;
  let pendingOrders = 0;

  if (childIds.length > 0) {
    // Оба счётчика бейджа — параллельно.
    const [{ count: pc }, { count: po }] = await Promise.all([
      supabase
        .from('task_completions')
        .select('id', { count: 'exact', head: true })
        .in('profile_id', childIds)
        .eq('status', 'pending'),
      supabase
        .from('reward_orders')
        .select('id', { count: 'exact', head: true })
        .in('profile_id', childIds)
        .eq('status', 'pending'),
    ]);
    pendingCount = pc ?? 0;
    pendingOrders = po ?? 0;
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Scrollable content — minHeight:0 ensures proper flex shrinking */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', background: '#ECEEF6' }}>
        {children}
      </div>

      <ParentTabBar pendingCount={pendingCount} pendingOrders={pendingOrders} />
    </div>
  );
}
