import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getActiveChildId } from '@/app/parent/children/actions';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinBalance } from '@/components/ui/Coin';
import { ExitChildButton } from '../ExitChildButton';
import { RewardCard } from './RewardCard';

type Profile = {
  id: string;
  family_id: string;
  role: 'parent' | 'child';
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  balance: number;
};

type Reward = {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  coin_cost: number;
  limit_type: string;
  available_to: string[] | null;
};

export default async function ShopPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const activeChildId = await getActiveChildId();
  if (activeChildId !== id) {
    redirect(`/parent/children/${id}`);
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('user_id', user.id)
    .single();
  if (!me) redirect('/');

  const { data: child } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single<Profile>();
  if (!child || child.family_id !== me.family_id || child.role !== 'child') notFound();

  // Все награды семьи
  const { data: allRewards = [] } = await supabase
    .from('rewards')
    .select('id, title, description, icon, coin_cost, limit_type, available_to')
    .eq('family_id', child.family_id)
    .is('archived_at', null)
    .order('coin_cost', { ascending: true })
    .returns<Reward[]>();

  // Фильтруем по available_to: либо null/empty (всем), либо содержит наш id
  const visibleRewards = (allRewards ?? []).filter((r) => {
    if (!r.available_to || r.available_to.length === 0) return true;
    return r.available_to.includes(child.id);
  });

  // Какие награды уже заказаны этим ребёнком (для лимита 'once')
  const { data: ordersData = [] } = await supabase
    .from('reward_orders')
    .select('reward_id, status')
    .eq('profile_id', child.id)
    .in('status', ['pending', 'fulfilled']);

  const orderedRewardIds = new Set(
    (ordersData ?? []).map((o) => o.reward_id)
  );

  return (
    <main style={{ minHeight: '100vh', padding: '20px 20px 40px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <Link
            href={`/child/${child.id}`}
            aria-label="Назад"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 100,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <PipLogo size={26} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={child.name} color={child.avatar_color} size="sm" />
            <ExitChildButton />
          </div>
        </header>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: '-0.015em',
            margin: '0 0 14px',
            lineHeight: 1.1,
          }}
        >
          Магазин 🎁
        </h1>

        <CoinBalance amount={child.balance} label="У тебя есть" />

        <section style={{ marginTop: 28 }}>
          {visibleRewards.length === 0 ? (
            <div
              style={{
                padding: '40px 24px',
                background: 'var(--bg-surface)',
                border: '1px dashed var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                textAlign: 'center',
                color: 'var(--text-soft)',
              }}
            >
              <div style={{ fontSize: 42, marginBottom: 14 }}>🌱</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                Пока нет наград.
                <br />
                Попроси родителей добавить!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleRewards.map((r) => {
                const alreadyOrdered = orderedRewardIds.has(r.id);
                const canAfford = child.balance >= r.coin_cost;
                const isOnceLimit = r.limit_type === 'once';
                const isBlocked = isOnceLimit && alreadyOrdered;

                return (
                  <RewardCard
                    key={r.id}
                    rewardId={r.id}
                    childId={child.id}
                    title={r.title}
                    description={r.description}
                    icon={r.icon}
                    coinCost={r.coin_cost}
                    canAfford={canAfford}
                    alreadyOrdered={isBlocked}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
