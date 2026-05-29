import { notFound } from 'next/navigation';
import { getChildContext } from '@/lib/getChildContext';
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
  const { db: supabase, familyId } = await getChildContext(id);

  const { data: child } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single<Profile>();
  if (!child || child.family_id !== familyId || child.role !== 'child') notFound();

  const { data: allRewards = [] } = await supabase
    .from('rewards')
    .select('id, title, description, icon, coin_cost, limit_type, available_to')
    .eq('family_id', child.family_id)
    .is('archived_at', null)
    .order('coin_cost', { ascending: true })
    .returns<Reward[]>();

  const visibleRewards = (allRewards ?? []).filter((r) => {
    if (!r.available_to || r.available_to.length === 0) return true;
    return r.available_to.includes(child.id);
  });

  const { data: ordersData = [] } = await supabase
    .from('reward_orders')
    .select('reward_id, status')
    .eq('profile_id', child.id)
    .in('status', ['pending', 'fulfilled']);

  const orderedRewardIds = new Set(
    (ordersData ?? []).map((o) => o.reward_id)
  );

  // Текущая цель-копилка ребёнка
  const { data: goalRow } = await supabase
    .from('reward_goals')
    .select('reward_id')
    .eq('child_id', child.id)
    .maybeSingle();
  const currentGoalRewardId = goalRow?.reward_id ?? null;

  return (
    <main style={{ minHeight: '100%', padding: '20px 16px 32px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 26,
              letterSpacing: '-0.015em',
              margin: '0 0 4px',
              lineHeight: 1.1,
            }}
          >
            Магазин 🎁
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
            Обменяй PIP на крутые награды
          </div>
        </div>

        {/* Grid or empty state */}
        {visibleRewards.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center',
              color: 'var(--text-soft)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 14 }}>🌱</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
              Пока нет наград.
              <br />
              Попроси родителей добавить!
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 12,
            }}
          >
            {visibleRewards.map((r, index) => {
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
                  balance={child.balance}
                  canAfford={canAfford}
                  alreadyOrdered={isBlocked}
                  cardIndex={index}
                  isGoal={currentGoalRewardId === r.id}
                  hasAnyGoal={currentGoalRewardId !== null}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
