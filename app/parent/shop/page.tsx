import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/ui/Avatar';
import { PipLogo } from '@/components/ui/PipLogo';

type Profile = {
  id: string;
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  avatar_emoji: string | null;
};

type Reward = {
  id: string;
  title: string;
  icon: string;
  coin_cost: number;
};

type RewardOrder = {
  id: string;
  reward_id: string;
  profile_id: string;
  status: string;
  created_at: string;
  reward: { title: string; icon: string; coin_cost: number } | null;
  profile: { name: string; avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky'; avatar_emoji: string | null } | null;
};

export default async function ParentShopPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();
  if (!me || me.role !== 'parent') redirect('/');

  const { data: children = [] } = await supabase
    .from('profiles')
    .select('id, name, avatar_color, avatar_emoji')
    .eq('family_id', me.family_id)
    .eq('role', 'child')
    .is('archived_at', null)
    .returns<Profile[]>();

  const childIds = (children ?? []).map((c) => c.id);

  // Pending orders (to fulfill)
  const { data: ordersRaw = [] } = await supabase
    .from('reward_orders')
    .select('id, reward_id, profile_id, status, created_at')
    .in('profile_id', childIds.length > 0 ? childIds : ['__none__'])
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Fetch reward + profile info for orders
  const rewardIds = [...new Set((ordersRaw ?? []).map((o) => o.reward_id))];
  const profileIds = [...new Set((ordersRaw ?? []).map((o) => o.profile_id))];

  const [{ data: rewardData }, { data: profileData }] = await Promise.all([
    rewardIds.length > 0
      ? supabase.from('rewards').select('id, title, icon, coin_cost').in('id', rewardIds)
      : Promise.resolve({ data: [] }),
    profileIds.length > 0
      ? supabase.from('profiles').select('id, name, avatar_color, avatar_emoji').in('id', profileIds)
      : Promise.resolve({ data: [] }),
  ]);

  const pendingOrders: RewardOrder[] = (ordersRaw ?? []).map((o) => ({
    ...o,
    reward: (rewardData ?? []).find((r: any) => r.id === o.reward_id) ?? null,
    profile: (profileData ?? []).find((p: any) => p.id === o.profile_id) ?? null,
  }));

  // Rewards catalog
  const { data: rewards = [] } = await supabase
    .from('rewards')
    .select('id, title, icon, coin_cost')
    .eq('family_id', me.family_id)
    .is('archived_at', null)
    .order('coin_cost', { ascending: true })
    .returns<Reward[]>();

  return (
    <main style={{ minHeight: '100%' }}>
      {/* Top bar */}
      <header
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-soft)',
          padding: '0 16px',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <PipLogo size={26} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Магазин</span>
        <div style={{ width: 26 }} />
      </header>

      <div style={{ padding: '20px 16px 32px', maxWidth: 600, margin: '0 auto' }}>

        {/* ── Pending orders ──────────────────────────────────────── */}
        {pendingOrders.length > 0 && (
          <section style={{ marginBottom: 28 }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 17,
                letterSpacing: '-0.01em',
                margin: '0 0 12px',
                color: 'var(--color-gold-deep)',
              }}
            >
              🎁 Выдать награды ({pendingOrders.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingOrders.map((order) => (
                <a
                  key={order.id}
                  href={`/parent/orders/${order.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--color-gold-soft)',
                    border: '1.5px solid var(--color-gold)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '12px 16px',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FFE39A, #D4A12E)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}>
                    {order.reward?.icon ?? '🎁'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-gold-deep)' }}>
                      {order.reward?.title ?? 'Награда'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-gold-deep)', opacity: 0.75, marginTop: 2 }}>
                      {order.profile?.name ?? '—'} · {order.reward?.coin_cost ?? 0} PIP
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-gold-deep)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Rewards catalog ─────────────────────────────────────── */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17,
              letterSpacing: '-0.01em', margin: 0,
            }}>
              Каталог наград
            </h2>
            <a
              href="/parent/rewards/new"
              style={{
                fontSize: 13, fontWeight: 600, color: 'var(--color-coral)',
                textDecoration: 'none', padding: '5px 10px',
                background: 'var(--color-coral-soft)', borderRadius: 100,
              }}
            >
              + Добавить
            </a>
          </div>

          {rewards?.length === 0 ? (
            <div style={{
              padding: '32px 24px', textAlign: 'center',
              background: 'var(--bg-surface)', border: '1px dashed var(--border-default)',
              borderRadius: 'var(--radius-xl)', color: 'var(--text-soft)',
            }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🌱</div>
              <p style={{ margin: 0, fontSize: 14 }}>Пока нет наград.<br />Создай первую!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(rewards ?? []).map((reward) => (
                <a
                  key={reward.id}
                  href={`/parent/rewards/${reward.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 16px',
                    textDecoration: 'none',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #FFE39A, #D4A12E)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0,
                  }}>
                    {reward.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>
                      {reward.title}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    background: 'var(--color-gold-soft)', borderRadius: 100,
                    padding: '3px 9px',
                  }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12, color: 'var(--color-gold-deep)' }}>
                      {reward.coin_cost} PIP
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Orders history link */}
        <a
          href="/parent/orders"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            marginTop: 16, padding: '10px',
            color: 'var(--text-soft)', fontSize: 13, fontWeight: 500,
            textDecoration: 'none', borderRadius: 'var(--radius-md)',
          }}
        >
          История заказов →
        </a>
      </div>
    </main>
  );
}
