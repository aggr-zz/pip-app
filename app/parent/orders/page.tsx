import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinPill } from '@/components/ui/Coin';

type PendingOrder = {
  id: string;
  reward_id: string;
  profile_id: string;
  ordered_at: string;
  coin_cost_at_order: number;
  reward: { title: string; icon: string } | null;
  profile: {
    name: string;
    avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  } | null;
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') redirect('/');

  // Дети семьи
  const { data: childProfiles = [] } = await supabase
    .from('profiles')
    .select('id, name, avatar_color')
    .eq('family_id', me.family_id)
    .eq('role', 'child');

  const childIds = (childProfiles ?? []).map((c) => c.id);
  const profileById = new Map((childProfiles ?? []).map((p) => [p.id, p]));

  let pending: PendingOrder[] = [];

  if (childIds.length > 0) {
    const { data: orders = [] } = await supabase
      .from('reward_orders')
      .select('id, reward_id, profile_id, ordered_at, coin_cost_at_order')
      .in('profile_id', childIds)
      .eq('status', 'pending')
      .order('ordered_at', { ascending: true });

    const rewardIds = Array.from(new Set((orders ?? []).map((o) => o.reward_id)));
    const { data: rewards = [] } = await supabase
      .from('rewards')
      .select('id, title, icon')
      .in('id', rewardIds);

    const rewardById = new Map((rewards ?? []).map((r) => [r.id, r]));

    pending = (orders ?? []).map((o) => ({
      id: o.id,
      reward_id: o.reward_id,
      profile_id: o.profile_id,
      ordered_at: o.ordered_at,
      coin_cost_at_order: o.coin_cost_at_order,
      reward: rewardById.get(o.reward_id) ?? null,
      profile: profileById.get(o.profile_id) ?? null,
    }));
  }

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px 64px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <header style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/parent"
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
          <PipLogo size={28} />
        </header>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 32,
            letterSpacing: '-0.02em',
            margin: '0 0 8px',
            lineHeight: 1.05,
          }}
        >
          К выдаче
        </h1>
        <p style={{ color: 'var(--text-soft)', fontSize: 14.5, margin: '0 0 24px', lineHeight: 1.5 }}>
          Заказы детей. Монеты уже списаны — осталось выдать награду в реальной жизни и нажать «Выдал».
        </p>

        {pending.length === 0 ? (
          <div
            style={{
              padding: '56px 24px',
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-default)',
              borderRadius: 'var(--radius-2xl)',
              textAlign: 'center',
              color: 'var(--text-soft)',
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 14 }}>📦</div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 20,
                margin: '0 0 8px',
                color: 'var(--text-primary)',
              }}
            >
              Нет заказов
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              Когда ребёнок что-то закажет в магазине, оно появится тут.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((o) => (
              <Link
                key={o.id}
                href={`/parent/orders/${o.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '14px 16px',
                  transition: 'border-color 0.15s',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--color-gold-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {o.reward?.icon || '🎁'}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3, marginBottom: 2 }}>
                    {o.reward?.title ?? '—'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {o.profile && (
                      <>
                        <Avatar
                          name={o.profile.name}
                          color={o.profile.avatar_color}
                          size="xs"
                        />
                        <span>{o.profile.name}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{timeAgo(o.ordered_at)}</span>
                  </div>
                </div>

                <CoinPill amount={o.coin_cost_at_order} />

                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} назад`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`;
}
