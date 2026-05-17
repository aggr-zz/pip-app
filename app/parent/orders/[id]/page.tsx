import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinPill } from '@/components/ui/Coin';
import { OrderActions } from './OrderActions';

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') redirect('/');

  const { data: order } = await supabase
    .from('reward_orders')
    .select('id, reward_id, profile_id, status, ordered_at, fulfilled_at, coin_cost_at_order, cancellation_reason')
    .eq('id', id)
    .single();

  if (!order) notFound();

  const { data: reward } = await supabase
    .from('rewards')
    .select('id, family_id, title, description, icon, coin_cost')
    .eq('id', order.reward_id)
    .single();

  if (!reward || reward.family_id !== me.family_id) notFound();

  const { data: child } = await supabase
    .from('profiles')
    .select('id, name, avatar_color, balance')
    .eq('id', order.profile_id)
    .single();

  if (!child) notFound();

  const isPending = order.status === 'pending';

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px 64px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <header style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/parent/orders"
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

        {!isPending && (
          <div
            style={{
              background:
                order.status === 'fulfilled'
                  ? 'var(--color-mint-soft)'
                  : 'var(--status-danger-soft)',
              border: `1px solid ${
                order.status === 'fulfilled' ? 'var(--color-mint)' : 'var(--status-danger)'
              }`,
              color:
                order.status === 'fulfilled' ? 'var(--color-mint-deep)' : 'var(--status-danger)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {order.status === 'fulfilled' && 'Выдано'}
            {order.status === 'cancelled' &&
              `Отменено: ${order.cancellation_reason ?? ''} · возвращено ${order.coin_cost_at_order} pip`}
          </div>
        )}

        {/* Reward card */}
        <section
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-2xl)',
            padding: 24,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'var(--color-gold-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 38,
                flexShrink: 0,
              }}
            >
              {reward.icon || '🎁'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 22,
                  letterSpacing: '-0.015em',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                }}
              >
                {reward.title}
              </div>
              {reward.description && (
                <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4 }}>
                  {reward.description}
                </div>
              )}
            </div>
            <CoinPill amount={order.coin_cost_at_order} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingTop: 16,
              borderTop: '1px solid var(--border-soft)',
            }}
          >
            <Avatar name={child.name} color={child.avatar_color} size="sm" />
            <div style={{ flex: 1, fontSize: 14 }}>
              <div style={{ fontWeight: 600 }}>{child.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                заказал(а) {timeAgo(order.ordered_at)}
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        {isPending ? (
          <OrderActions
            orderId={order.id}
            childName={child.name}
            cost={order.coin_cost_at_order}
          />
        ) : (
          <Link
            href="/parent/orders"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 14.5,
            }}
          >
            К списку заказов
          </Link>
        )}

        <div
          style={{
            marginTop: 24,
            padding: '12px 16px',
            background: 'var(--bg-surface-2)',
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12.5,
            color: 'var(--text-soft)',
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>
            Баланс {child.name}: {child.balance} pip
          </strong>
          {isPending && (
            <div style={{ marginTop: 4 }}>
              Монеты уже списаны при заказе. Если выдать не получится — отмени, и они вернутся.
            </div>
          )}
        </div>
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
