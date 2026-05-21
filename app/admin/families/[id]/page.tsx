import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin';
import { Avatar } from '@/components/ui/Avatar';
import { CoinDot } from '@/components/ui/Coin';

type Family = {
  id: string;
  name: string;
  timezone: string;
  locale: string;
  auto_approve_hours: number;
  created_at: string;
};

type Profile = {
  id: string;
  role: 'parent' | 'child';
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  balance: number;
  current_streak: number;
  birth_year: number | null;
  archived_at: string | null;
  created_at: string;
};

type Completion = {
  id: string;
  task_id: string;
  profile_id: string;
  status: string;
  completed_at: string;
  awarded_coins: number | null;
};

type Order = {
  id: string;
  reward_id: string;
  profile_id: string;
  status: string;
  coin_cost_at_order: number;
  ordered_at: string;
};

type Tx = {
  id: string;
  profile_id: string;
  type: string;
  amount: number;
  cash_amount: number | null;
  reason: string | null;
  created_at: string;
};

export default async function AdminFamilyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin(`/admin/families/${id}`);

  const { data: family } = await supabase
    .from('families')
    .select('*')
    .eq('id', id)
    .single<Family>();

  if (!family) notFound();

  const { data: members = [] } = await supabase
    .from('profiles')
    .select('*')
    .eq('family_id', id)
    .order('role')
    .order('name')
    .returns<Profile[]>();

  const memberIds = (members ?? []).map((m) => m.id);

  const [
    { data: completions = [] },
    { data: orders = [] },
    { data: transactions = [] },
    { count: tasksCount },
    { count: rewardsCount },
  ] = await Promise.all([
    supabase
      .from('task_completions')
      .select('id, task_id, profile_id, status, completed_at, awarded_coins')
      .in('profile_id', memberIds)
      .order('completed_at', { ascending: false })
      .limit(20)
      .returns<Completion[]>(),
    supabase
      .from('reward_orders')
      .select('id, reward_id, profile_id, status, coin_cost_at_order, ordered_at')
      .in('profile_id', memberIds)
      .order('ordered_at', { ascending: false })
      .limit(20)
      .returns<Order[]>(),
    supabase
      .from('transactions')
      .select('id, profile_id, type, amount, cash_amount, reason, created_at')
      .in('profile_id', memberIds)
      .order('created_at', { ascending: false })
      .limit(20)
      .returns<Tx[]>(),
    supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', id)
      .is('archived_at', null),
    supabase
      .from('rewards')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', id)
      .is('archived_at', null),
  ]);

  const profileName = new Map((members ?? []).map((m) => [m.id, m.name]));

  const parents = (members ?? []).filter((m) => m.role === 'parent');
  const children = (members ?? []).filter((m) => m.role === 'child' && !m.archived_at);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Link
        href="/admin/families"
        style={{
          fontSize: 13,
          color: 'var(--text-soft)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 16,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        Все семьи
      </Link>

      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 32,
          letterSpacing: '-0.02em',
          margin: '0 0 6px',
          lineHeight: 1.05,
        }}
      >
        {family.name}
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 12.5, margin: '0 0 24px', fontFamily: 'var(--font-mono)' }}>
        {family.id} · {family.timezone} · {family.locale} · auto-approve {family.auto_approve_hours}ч · с {formatDate(family.created_at)}
      </p>

      {/* Stats summary */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
          marginBottom: 28,
        }}
      >
        <MiniStat label="Родителей" value={parents.length} />
        <MiniStat label="Детей" value={children.length} />
        <MiniStat label="Задач активно" value={tasksCount ?? 0} />
        <MiniStat label="Наград активно" value={rewardsCount ?? 0} />
      </div>

      {/* Members */}
      <Section title="Состав">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(members ?? []).map((m) => (
            <div
              key={m.id}
              style={{
                background: m.archived_at ? 'var(--bg-surface-2)' : 'var(--bg-surface)',
                border: '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: m.archived_at ? 0.5 : 1,
              }}
            >
              <Avatar name={m.name} color={m.avatar_color} size="sm" />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {m.name}
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 100,
                      background: m.role === 'parent' ? 'var(--color-ink)' : 'var(--color-coral-soft)',
                      color: m.role === 'parent' ? 'white' : 'var(--color-coral-deep)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {m.role === 'parent' ? 'родитель' : 'ребёнок'}
                  </span>
                  {m.archived_at && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                      (архив)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {m.id.slice(0, 8)}… · с {formatDate(m.created_at)}
                </div>
              </div>
              {m.role === 'child' && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: 16, fontFamily: 'var(--font-display)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <CoinDot size={11} />
                    {m.balance}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-soft)' }}>
                    🔥 {m.current_streak}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* Recent completions */}
      <Section title={`Последние выполнения (${completions?.length ?? 0})`}>
        {(!completions || completions.length === 0) ? (
          <EmptyRow>Пока никто ничего не делал.</EmptyRow>
        ) : (
          <SimpleList>
            {completions.map((c) => (
              <SimpleRow
                key={c.id}
                left={
                  <>
                    <StatusBadge status={c.status} />
                    <span style={{ marginLeft: 8 }}>{profileName.get(c.profile_id) ?? '—'}</span>
                  </>
                }
                center={c.task_id.slice(0, 8) + '…'}
                right={
                  <>
                    {c.awarded_coins ? (
                      <span style={{ fontWeight: 600, color: 'var(--color-mint-deep)' }}>+{c.awarded_coins}</span>
                    ) : null}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 12, fontSize: 11.5 }}>
                      {timeAgo(c.completed_at)}
                    </span>
                  </>
                }
              />
            ))}
          </SimpleList>
        )}
      </Section>

      {/* Recent orders */}
      <Section title={`Последние заказы наград (${orders?.length ?? 0})`}>
        {(!orders || orders.length === 0) ? (
          <EmptyRow>Ещё не было заказов в магазине.</EmptyRow>
        ) : (
          <SimpleList>
            {orders.map((o) => (
              <SimpleRow
                key={o.id}
                left={
                  <>
                    <StatusBadge status={o.status} />
                    <span style={{ marginLeft: 8 }}>{profileName.get(o.profile_id) ?? '—'}</span>
                  </>
                }
                center={o.reward_id.slice(0, 8) + '…'}
                right={
                  <>
                    <span style={{ fontWeight: 600 }}>−{o.coin_cost_at_order} PIP</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 12, fontSize: 11.5 }}>
                      {timeAgo(o.ordered_at)}
                    </span>
                  </>
                }
              />
            ))}
          </SimpleList>
        )}
      </Section>

      {/* Recent transactions */}
      <Section title={`Последние транзакции (${transactions?.length ?? 0})`}>
        {(!transactions || transactions.length === 0) ? (
          <EmptyRow>Пока без движений.</EmptyRow>
        ) : (
          <SimpleList>
            {transactions.map((t) => (
              <SimpleRow
                key={t.id}
                left={
                  <>
                    <TxTypeBadge type={t.type} />
                    <span style={{ marginLeft: 8 }}>{profileName.get(t.profile_id) ?? '—'}</span>
                  </>
                }
                center={t.reason ?? '—'}
                right={
                  <>
                    <span
                      style={{
                        fontWeight: 700,
                        fontFamily: 'var(--font-display)',
                        color: t.amount > 0 ? 'var(--color-mint-deep)' : 'var(--color-coral-deep)',
                      }}
                    >
                      {t.amount > 0 ? '+' : ''}{t.amount}
                    </span>
                    {t.cash_amount && (
                      <span style={{ color: 'var(--text-soft)', marginLeft: 10, fontSize: 12 }}>
                        ({formatCash(Number(t.cash_amount))} ₽)
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 12, fontSize: 11.5 }}>
                      {timeAgo(t.created_at)}
                    </span>
                  </>
                }
              />
            ))}
          </SimpleList>
        )}
      </Section>
    </div>
  );
}

// ─── Local UI helpers ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 16,
          letterSpacing: '-0.01em',
          margin: '0 0 10px',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: 12,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-soft)', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>
        {value.toLocaleString('ru-RU')}
      </div>
    </div>
  );
}

function SimpleList({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

function SimpleRow({
  left,
  center,
  right,
}: {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr auto',
        gap: 12,
        padding: '10px 14px',
        fontSize: 13,
        borderBottom: '1px solid var(--border-soft)',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>{left}</div>
      <div style={{ color: 'var(--text-soft)', fontFamily: 'var(--font-mono)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {center}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>{right}</div>
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '24px',
        background: 'var(--bg-surface)',
        border: '1px dashed var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        textAlign: 'center',
        fontSize: 13,
        color: 'var(--text-soft)',
      }}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    pending: { bg: 'var(--color-gold-soft)', fg: 'var(--color-gold-deep)' },
    approved: { bg: 'var(--color-mint-soft)', fg: 'var(--color-mint-deep)' },
    auto_approved: { bg: 'var(--color-mint-soft)', fg: 'var(--color-mint-deep)' },
    rejected: { bg: 'var(--status-danger-soft)', fg: 'var(--status-danger)' },
    fulfilled: { bg: 'var(--color-mint-soft)', fg: 'var(--color-mint-deep)' },
    cancelled: { bg: 'var(--status-danger-soft)', fg: 'var(--status-danger)' },
  };
  const c = colors[status] || { bg: 'var(--bg-surface-2)', fg: 'var(--text-soft)' };
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 7px',
        borderRadius: 100,
        background: c.bg,
        color: c.fg,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function TxTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    task_reward: 'task',
    reward_purchase: 'reward',
    refund: 'refund',
    bonus: 'bonus',
    manual_adjustment: 'adjust',
    cash_payout: 'cash',
  };
  return (
    <span
      style={{
        fontSize: 10,
        padding: '2px 7px',
        borderRadius: 100,
        background: 'var(--bg-surface-2)',
        color: 'var(--text-soft)',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {labels[type] || type}
    </span>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
}

function formatCash(n: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}м`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}ч`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}д`;
  return formatDate(iso);
}
