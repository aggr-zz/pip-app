import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Button } from '@/components/ui/Button';
import { CoinPill } from '@/components/ui/Coin';

type Reward = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  coin_cost: number;
  limit_type: string;
  available_to: string[] | null;
  archived_at: string | null;
};

export default async function RewardsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const params = await searchParams;
  const showArchived = params.archived === '1';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') redirect('/');

  const query = supabase
    .from('rewards')
    .select('id, title, description, icon, coin_cost, limit_type, available_to, archived_at')
    .eq('family_id', me.family_id)
    .order('coin_cost', { ascending: true });

  if (showArchived) {
    query.not('archived_at', 'is', null);
  } else {
    query.is('archived_at', null);
  }

  const { data: rewards = [] } = await query.returns<Reward[]>();

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px 64px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <header style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/parent"
            aria-label="Назад"
            style={backLinkStyle}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <PipLogo size={28} href="/parent" />
        </header>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
          <h1 style={titleStyle}>Награды</h1>
          <Link href="/parent/rewards/new" style={{ textDecoration: 'none' }}>
            <Button variant="ink" size="md">+ Новая</Button>
          </Link>
        </div>
        <p style={subtitleStyle}>
          Каталог того, на что ребёнок может потратить PIP. Деньги или предметы из реального мира — выдаются вне приложения.
        </p>

        {/* Фильтр архив / активные */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <Link
            href="/parent/rewards"
            style={tabStyle(!showArchived)}
          >
            Активные
          </Link>
          <Link
            href="/parent/rewards?archived=1"
            style={tabStyle(showArchived)}
          >
            Архив
          </Link>
        </div>

        {!rewards || rewards.length === 0 ? (
          <div style={emptyStyle}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>🎁</div>
            <h2 style={emptyTitleStyle}>
              {showArchived ? 'В архиве пусто' : 'Нет наград'}
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.5 }}>
              {showArchived
                ? 'Архивированные награды появятся тут'
                : 'Создай первую — например, «Выбор фильма на вечер» за 50 PIP или «Велосипед» за 5000 PIP как большая цель'}
            </p>
            {!showArchived && (
              <Link href="/parent/rewards/new" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="lg">+ Создать награду</Button>
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rewards.map((r) => (
              <RewardListItem key={r.id} reward={r} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function RewardListItem({ reward }: { reward: Reward }) {
  const isArchived = !!reward.archived_at;
  return (
    <Link
      href={`/parent/rewards/${reward.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-xl)',
        padding: '14px 16px',
        opacity: isArchived ? 0.6 : 1,
        transition: 'border-color 0.15s',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--color-gold-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          flexShrink: 0,
        }}
      >
        {reward.icon || '🎁'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{reward.title}</div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-soft)',
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {reward.description ||
            (reward.limit_type === 'once' ? 'Один раз' : 'Можно много раз')}
          {reward.available_to && reward.available_to.length > 0 && (
            <span> · только для некоторых детей</span>
          )}
        </div>
      </div>

      <CoinPill amount={reward.coin_cost} />

      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

const backLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 100,
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};

const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 32,
  letterSpacing: '-0.02em',
  margin: 0,
  lineHeight: 1.05,
};

const subtitleStyle: React.CSSProperties = {
  color: 'var(--text-soft)',
  fontSize: 14.5,
  margin: '8px 0 24px',
  lineHeight: 1.5,
};

const emptyStyle: React.CSSProperties = {
  padding: '56px 24px',
  background: 'var(--bg-surface)',
  border: '1px dashed var(--border-default)',
  borderRadius: 'var(--radius-2xl)',
  textAlign: 'center',
};

const emptyTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 22,
  margin: '0 0 8px',
};

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    background: active ? 'var(--color-ink)' : 'var(--bg-surface)',
    color: active ? 'white' : 'var(--text-primary)',
    border: `1px solid ${active ? 'var(--color-ink)' : 'var(--border-default)'}`,
    borderRadius: 'var(--radius-pill)',
    fontSize: 13,
    fontWeight: 500,
  };
}
