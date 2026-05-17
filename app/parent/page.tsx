import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinPill } from '@/components/ui/Coin';
import { Button } from '@/components/ui/Button';
import { SignOutButton } from './SignOutButton';
import { RealtimeRefresh } from '@/components/realtime/RealtimeRefresh';

type Profile = {
  id: string;
  family_id: string;
  role: 'parent' | 'child';
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  balance: number;
  current_streak: number;
};

type Family = {
  id: string;
  name: string;
};

export default async function ParentDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Загружаем текущего родителя
  const { data: me } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single<Profile>();

  if (!me) {
    // Профиль не создался (триггер handle_new_user не сработал?) — отправляем на онбординг
    return (
      <main style={{ padding: 32, maxWidth: 600, margin: '0 auto' }}>
        <h1>Профиль не найден</h1>
        <p>Что-то пошло не так при регистрации. Попробуй выйти и зайти снова.</p>
        <SignOutButton />
      </main>
    );
  }

  if (me.role === 'child') redirect('/child');

  // Загружаем семью
  const { data: family } = await supabase
    .from('families')
    .select('*')
    .eq('id', me.family_id)
    .single<Family>();

  // Загружаем детей в семье
  const { data: children = [] } = await supabase
    .from('profiles')
    .select('*')
    .eq('family_id', me.family_id)
    .eq('role', 'child')
    .is('archived_at', null)
    .order('name')
    .returns<Profile[]>();

  // Считаем количество задач на подтверждение
  const childIds = (children ?? []).map((c) => c.id);
  let pendingCount = 0;
  let pendingOrdersCount = 0;
  if (childIds.length > 0) {
    const { count } = await supabase
      .from('task_completions')
      .select('id', { count: 'exact', head: true })
      .in('profile_id', childIds)
      .eq('status', 'pending');
    pendingCount = count || 0;

    const { count: ordersCount } = await supabase
      .from('reward_orders')
      .select('id', { count: 'exact', head: true })
      .in('profile_id', childIds)
      .eq('status', 'pending');
    pendingOrdersCount = ordersCount || 0;
  }

  return (
    <main className="page">
      {/* Sprint 7: реалтайм-обновления pending-счётчиков */}
      <RealtimeRefresh tables={['task_completions', 'reward_orders']} />

      {/* ─── Header ─── */}
      <header className="header">
        <div className="header__container">
          <div className="header__logo">
            <PipLogo size={32} />
          </div>
          <div className="header__actions">
            <span className="header__hello">
              Привет, {me.name}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="container">

        {/* ─── Urgent banner ─── */}
        {pendingCount > 0 && (
          <a href="/parent/approvals" className="urgent">
            <div className="urgent__icon">⚡</div>
            <div className="urgent__body">
              <div className="urgent__title">
                {pendingCount} {wordForm(pendingCount, 'задание', 'задания', 'заданий')} на подтверждение
              </div>
              <div className="urgent__sub">Кликни, чтобы посмотреть и подтвердить</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        )}

        {pendingOrdersCount > 0 && (
          <a href="/parent/orders" className="urgent urgent--gold">
            <div className="urgent__icon">🎁</div>
            <div className="urgent__body">
              <div className="urgent__title">
                {pendingOrdersCount} {wordForm(pendingOrdersCount, 'заказ', 'заказа', 'заказов')} на выдачу
              </div>
              <div className="urgent__sub">Награды, которые ребёнок купил</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        )}

        {/* ─── Empty state if no children ─── */}
        {(!children || children.length === 0) ? (
          <div className="empty">
            <div className="empty__icon">👋</div>
            <h2 className="empty__title">Добавь первого ребёнка</h2>
            <p className="empty__text">
              pip начинает работать когда в семье появляется ребёнок. Создадим его профиль и пин-код, по которому ребёнок войдёт со своего устройства.
            </p>
            <a href="/parent/children/new" style={{ display: 'inline-block', textDecoration: 'none' }}>
              <Button variant="ink" size="lg">+ Добавить ребёнка</Button>
            </a>
          </div>
        ) : (
          <>
            {/* ─── Children list ─── */}
            <div className="section-head">
              <h2 className="section-title">Дети</h2>
              <a href="/parent/children/new" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="sm">+ Добавить</Button>
              </a>
            </div>

            <div className="kids">
              {children.map((kid) => (
                <a key={kid.id} href={`/parent/children/${kid.id}`} className="kid-card">
                  <div className="kid-card__head">
                    <Avatar name={kid.name} color={kid.avatar_color} size="md" />
                    <div className="kid-card__info">
                      <div className="kid-card__name">{kid.name}</div>
                      <div className="kid-card__meta">
                        стрик {kid.current_streak} 🔥
                      </div>
                    </div>
                    <CoinPill amount={kid.balance} />
                  </div>
                </a>
              ))}
            </div>

            <div className="actions actions--2col">
              <a href="/parent/tasks/new" style={{ textDecoration: 'none' }}>
                <Button variant="ink" size="md" fullWidth>+ Задание</Button>
              </a>
              <a href="/parent/rewards/new" style={{ textDecoration: 'none' }}>
                <Button variant="ink" size="md" fullWidth>+ Награда</Button>
              </a>
            </div>
            <div className="actions actions--2col" style={{ marginTop: 8 }}>
              <a href="/parent/tasks" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="md" fullWidth>Все задания</Button>
              </a>
              <a href="/parent/rewards" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="md" fullWidth>Все награды</Button>
              </a>
            </div>
            <div style={{ marginTop: 8 }}>
              <a href="/parent/stats" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="md" fullWidth>📊 Статистика семьи</Button>
              </a>
            </div>
          </>
        )}

        {/* ─── Dev info ─── */}
        <div className="dev-info">
          <div className="dev-info__label">DEV INFO</div>
          <div>family: <code>{family?.name ?? '—'}</code></div>
          <div>user_id: <code>{user.id.slice(0, 8)}…</code></div>
          <div>profile.role: <code>{me.role}</code></div>
          <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>
            Готовы Sprint 1-4 (дети, задачи, подтверждения, награды). Дальше: учёт выданных денег, статистика, админка.
          </p>
        </div>
      </div>

      <style>{`
        .page { min-height: 100vh; padding-bottom: 64px; }
        .header {
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-soft);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .header__container {
          max-width: 720px;
          margin: 0 auto;
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header__hello {
          font-size: 13.5px;
          color: var(--text-soft);
        }
        .header__actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .container {
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 20px;
        }
        .urgent {
          display: flex;
          align-items: center;
          gap: 14px;
          background: var(--color-coral);
          color: white;
          padding: 16px 18px;
          border-radius: var(--radius-xl);
          margin-bottom: 10px;
          transition: background 0.15s;
        }
        .urgent:last-of-type { margin-bottom: 32px; }
        .urgent:hover { background: var(--color-coral-deep); }
        .urgent--gold {
          background: var(--color-gold-deep);
        }
        .urgent--gold:hover {
          background: #B88C20;
        }
        .urgent__icon {
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.18);
          border-radius: var(--radius-md);
          display: grid;
          place-items: center;
          font-size: 20px;
          flex-shrink: 0;
        }
        .urgent__body { flex: 1; }
        .urgent__title { font-weight: 600; font-size: 15px; }
        .urgent__sub { font-size: 12.5px; opacity: 0.85; margin-top: 2px; }
        .empty {
          text-align: center;
          padding: 64px 24px;
          background: var(--bg-surface);
          border-radius: var(--radius-2xl);
          border: 1px solid var(--border-soft);
        }
        .empty__icon { font-size: 56px; margin-bottom: 16px; }
        .empty__title {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 26px;
          letter-spacing: -0.015em;
          margin: 0 0 12px;
        }
        .empty__text {
          color: var(--text-soft);
          font-size: 15px;
          line-height: 1.55;
          max-width: 420px;
          margin: 0 auto 28px;
        }
        .section-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 16px;
        }
        .section-title {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 22px;
          letter-spacing: -0.015em;
          margin: 0;
        }
        .kids { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
        .kid-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-soft);
          border-radius: var(--radius-xl);
          padding: 16px;
          transition: border-color 0.15s, transform 0.1s;
        }
        .kid-card:hover {
          border-color: var(--border-default);
        }
        .kid-card:active { transform: translateY(1px); }
        .kid-card__head {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .kid-card__info { flex: 1; min-width: 0; }
        .kid-card__name { font-weight: 600; font-size: 16px; }
        .kid-card__meta {
          font-size: 12.5px;
          color: var(--text-soft);
          margin-top: 2px;
        }
        .actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 48px;
        }
        .dev-info {
          margin-top: 64px;
          padding: 16px 18px;
          background: var(--bg-surface-2);
          border: 1px dashed var(--border-default);
          border-radius: var(--radius-lg);
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-soft);
        }
        .dev-info__label {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          margin-bottom: 6px;
        }
        .dev-info code {
          color: var(--text-primary);
          background: var(--bg-surface);
          padding: 1px 5px;
          border-radius: 3px;
        }
      `}</style>
    </main>
  );
}

function wordForm(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
