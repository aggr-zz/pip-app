import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

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
  profile: { name: string } | null;
};

// ─── Icon gradients — same palette as child's RewardCard ──────────────────
const ICON_GRADIENTS = [
  'linear-gradient(135deg, #FFB997, #EE6C4D)',
  'linear-gradient(135deg, #FFE39A, #D4A12E)',
  'linear-gradient(135deg, #95D5B2, #5BA890)',
  'linear-gradient(135deg, #B3DCFA, #5B85C9)',
  'linear-gradient(135deg, #FFC1CC, #E27396)',
];
function iconGradient(i: number) {
  return ICON_GRADIENTS[i % ICON_GRADIENTS.length];
}

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
    .select('id, name')
    .eq('family_id', me.family_id)
    .eq('role', 'child')
    .is('archived_at', null);

  const childIds = (children ?? []).map((c) => c.id);

  // Pending orders
  const { data: ordersRaw = [] } = await supabase
    .from('reward_orders')
    .select('id, reward_id, profile_id, status, created_at')
    .in('profile_id', childIds.length > 0 ? childIds : ['__none__'])
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const rewardIds = [...new Set((ordersRaw ?? []).map((o) => o.reward_id))];
  const profileIds = [...new Set((ordersRaw ?? []).map((o) => o.profile_id))];

  const [{ data: rewardData }, { data: profileData }] = await Promise.all([
    rewardIds.length > 0
      ? supabase.from('rewards').select('id, title, icon, coin_cost').in('id', rewardIds)
      : Promise.resolve({ data: [] }),
    profileIds.length > 0
      ? supabase.from('profiles').select('id, name').in('id', profileIds)
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
    <main style={{ minHeight: '100%', padding: '20px 16px 32px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* ── Header — same as child shop ─────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700, fontSize: 26,
            letterSpacing: '-0.015em',
            margin: '0 0 4px', lineHeight: 1.1,
          }}>
            Магазин 🎁
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
            Управляй наградами и выдавай заказы
          </div>
        </div>

        {/* ── Pending orders ─────────────────────────────────────── */}
        {pendingOrders.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: 'var(--color-gold-deep)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              marginBottom: 10,
            }}>
              ⚡ Выдать награды ({pendingOrders.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingOrders.map((order) => (
                <a
                  key={order.id}
                  href={`/parent/orders/${order.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--color-gold-soft)',
                    border: '1.5px solid var(--color-gold)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '12px 14px', textDecoration: 'none',
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
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 14,
                      color: 'var(--color-gold-deep)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
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
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            marginBottom: 10,
          }}>
            Каталог наград
          </div>

          {(rewards ?? []).length === 0 ? (
            <div style={{
              padding: '48px 24px',
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-default)',
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center', color: 'var(--text-soft)',
            }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🌱</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                Пока нет наград.<br />Создай первую!
              </p>
              <a
                href="/parent/rewards/new"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  marginTop: 20,
                  background: 'var(--color-ink)', color: 'white',
                  padding: '12px 22px', borderRadius: 'var(--radius-lg)',
                  fontWeight: 600, fontSize: 14, textDecoration: 'none',
                }}
              >
                + Добавить награду
              </a>
            </div>
          ) : (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 12,
              }}>
                {(rewards ?? []).map((reward, i) => (
                  <a
                    key={reward.id}
                    href={`/parent/rewards/${reward.id}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: 'var(--radius-xl)',
                      padding: '16px 12px 14px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      textAlign: 'center',
                      height: '100%',
                    }}>
                      {/* Icon */}
                      <div style={{
                        width: 64, height: 64, borderRadius: '50%',
                        background: iconGradient(i),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 30, marginBottom: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                      }}>
                        {reward.icon}
                      </div>

                      {/* Title */}
                      <div style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 600, fontSize: 13.5, lineHeight: 1.25,
                        color: 'var(--text-primary)', marginBottom: 10,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        minHeight: '2.5em',
                        flex: 1,
                      }}>
                        {reward.title}
                      </div>

                      {/* Price pill */}
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        background: 'var(--color-gold-soft)',
                        borderRadius: 100, padding: '4px 10px 4px 7px',
                        marginBottom: 10,
                      }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" fill="var(--color-gold)" />
                          <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                          <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold"
                            fill="rgba(255,255,255,0.9)" fontFamily="sans-serif">P</text>
                        </svg>
                        <span style={{
                          fontFamily: 'var(--font-display)', fontWeight: 700,
                          fontSize: 12, color: 'var(--color-gold-deep)', letterSpacing: '-0.01em',
                        }}>
                          {reward.coin_cost}
                        </span>
                      </div>

                      {/* Edit button */}
                      <div style={{
                        width: '100%', padding: '7px 6px',
                        background: 'var(--bg-surface-2)',
                        border: '1px solid var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-soft)',
                        fontWeight: 600, fontSize: 12,
                        textAlign: 'center',
                      }}>
                        Изменить
                      </div>
                    </div>
                  </a>
                ))}

                {/* Add new reward card */}
                <a href="/parent/rewards/new" style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'var(--bg-surface)',
                    border: '1.5px dashed var(--border-default)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '16px 12px 14px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', textAlign: 'center',
                    minHeight: 180, gap: 8,
                    height: '100%',
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'var(--bg-surface-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 24, color: 'var(--text-muted)',
                    }}>
                      +
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-soft)' }}>
                      Добавить
                    </div>
                  </div>
                </a>
              </div>

              {/* Orders history link */}
              <a
                href="/parent/orders"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 20, padding: '10px',
                  color: 'var(--text-soft)', fontSize: 13, fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                История заказов →
              </a>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
