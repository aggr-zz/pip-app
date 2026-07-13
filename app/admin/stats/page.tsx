import { requireAdmin } from '@/lib/admin';

type StatsRow = {
  total_families: number;
  total_parents: number;
  total_children: number;
  active_families_7d: number;
  total_tasks: number;
  total_completions: number;
  total_rewards: number;
  total_orders_fulfilled: number;
  total_pip_in_circulation: number;
  total_cash_paid: number;
  total_waitlist: number;
};

type FamilyRow = {
  id: string;
  name: string;
  child_count: number;
  total_pip_balance: number;
  task_count: number;
  last_activity: string | null;
};

type FunnelRow = {
  registered: number;
  added_child: number;
  has_task: number;
  child_completed: number;
  approved: number;
  ordered_reward: number;
};

export default async function AdminStatsPage() {
  const { supabase } = await requireAdmin('/admin/stats');

  const [
    { data: statsRows },
    { data: familyRows },
    { data: funnelRows },
    { count: pendingApprovals },
    { count: pendingOrders },
  ] = await Promise.all([
    supabase.rpc('admin_stats_overview').returns<StatsRow[]>(),
    supabase.rpc('admin_families_overview').returns<FamilyRow[]>(),
    supabase.rpc('admin_activation_funnel').returns<FunnelRow[]>(),
    supabase.from('task_completions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('reward_orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
  ]);

  const stats = (statsRows && statsRows[0]) || null;
  const families = familyRows ?? [];
  const funnel = (funnelRows && funnelRows[0]) || null;

  const totalUsers = (stats?.total_parents ?? 0) + (stats?.total_children ?? 0);
  const avgChildrenPerFamily =
    stats?.total_families && stats.total_families > 0
      ? (stats.total_children / stats.total_families).toFixed(1)
      : '0';
  const avgBalance =
    stats?.total_children && stats.total_children > 0
      ? Math.round(Number(stats.total_pip_in_circulation) / stats.total_children)
      : 0;
  const completionsPerFamily =
    stats?.total_families && stats.total_families > 0
      ? (stats.total_completions / stats.total_families).toFixed(1)
      : '0';

  // Топ-10 семей по выполненным задачам
  const topFamilies = [...families]
    .sort((a, b) => b.task_count - a.task_count)
    .slice(0, 10);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
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
        Статистика системы
      </h1>
      <p style={{ color: 'var(--text-soft)', fontSize: 14.5, margin: '0 0 28px' }}>
        Метрики использования по всей платформе
      </p>

      {/* Pending alerts */}
      {((pendingApprovals ?? 0) > 0 || (pendingOrders ?? 0) > 0) && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
            marginBottom: 28,
          }}
        >
          {(pendingApprovals ?? 0) > 0 && (
            <AlertCard
              label="Pending подтверждений"
              value={pendingApprovals ?? 0}
              hint="по всем семьям"
              accent="coral"
            />
          )}
          {(pendingOrders ?? 0) > 0 && (
            <AlertCard
              label="Pending заказов"
              value={pendingOrders ?? 0}
              hint="ждут выдачи у родителей"
              accent="gold"
            />
          )}
        </div>
      )}

      {/* Воронка активации */}
      {funnel && (
        <section style={{ marginBottom: 32 }}>
          <SectionTitle>Воронка активации</SectionTitle>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-xl)',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {[
              { label: 'Зарегистрировались', value: funnel.registered },
              { label: 'Добавили ребёнка', value: funnel.added_child },
              { label: 'Есть задание у ребёнка', value: funnel.has_task },
              { label: 'Ребёнок выполнил', value: funnel.child_completed },
              { label: 'Одобрено / начислено', value: funnel.approved },
              { label: 'Заказал награду', value: funnel.ordered_reward },
            ].map((s, i, arr) => {
              const base = arr[0].value || 1;
              const pct = Math.round((Number(s.value) / base) * 100);
              const prev = i > 0 ? Number(arr[i - 1].value) : null;
              const drop = prev !== null && prev > Number(s.value) ? prev - Number(s.value) : 0;
              return (
                <FunnelStage
                  key={s.label}
                  label={s.label}
                  value={Number(s.value)}
                  pct={pct}
                  drop={drop}
                  isFirst={i === 0}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Top stats */}
      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Размер</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 10,
          }}
        >
          <StatCard label="Пользователей" value={totalUsers} />
          <StatCard label="Семей" value={stats?.total_families ?? 0} />
          <StatCard label="Родителей" value={stats?.total_parents ?? 0} />
          <StatCard label="Детей" value={stats?.total_children ?? 0} />
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Engagement</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 10,
          }}
        >
          <StatCard label="Активных за 7д" value={stats?.active_families_7d ?? 0} sub={`из ${stats?.total_families ?? 0} семей`} />
          <StatCard label="Задач в каталогах" value={stats?.total_tasks ?? 0} />
          <StatCard label="Всего выполнений" value={stats?.total_completions ?? 0} />
          <StatCard label="Заказов выдано" value={stats?.total_orders_fulfilled ?? 0} />
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Экономика</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          <StatCard
            label="PIP в обороте"
            value={Number(stats?.total_pip_in_circulation ?? 0).toLocaleString('ru-RU')}
            sub="сумма всех балансов"
          />
          <StatCard
            label="Выдано наличными"
            value={`${formatCash(Number(stats?.total_cash_paid ?? 0))} ₽`}
            sub="всего за всё время"
          />
          <StatCard
            label="Наград в каталогах"
            value={stats?.total_rewards ?? 0}
          />
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Средние</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          <StatCard label="Детей на семью" value={avgChildrenPerFamily} />
          <StatCard label="Баланс ребёнка" value={avgBalance} sub="PIP" />
          <StatCard label="Выполнений / семья" value={completionsPerFamily} />
        </div>
      </section>

      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Funnel</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          <StatCard label="Waitlist" value={stats?.total_waitlist ?? 0} accent="gold" />
          <StatCard
            label="Конверсия в семью"
            value={
              (stats?.total_waitlist ?? 0) > 0
                ? `${Math.round((Number(stats?.total_families ?? 0) / Number(stats?.total_waitlist ?? 1)) * 100)}%`
                : '—'
            }
            sub="семей / waitlist"
          />
          <StatCard
            label="Retention 7д"
            value={
              (stats?.total_families ?? 0) > 0
                ? `${Math.round((Number(stats?.active_families_7d ?? 0) / Number(stats?.total_families ?? 1)) * 100)}%`
                : '—'
            }
            sub="активных / всего"
          />
        </div>
      </section>

      {/* Top families by tasks */}
      {topFamilies.length > 0 && (
        <section>
          <SectionTitle>Самые активные семьи (по задачам)</SectionTitle>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
            }}
          >
            {topFamilies.map((f, i) => (
              <div
                key={f.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '30px 1fr 80px 100px',
                  gap: 12,
                  padding: '12px 16px',
                  fontSize: 13.5,
                  borderBottom: '1px solid var(--border-soft)',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    color: i < 3 ? 'var(--color-gold-deep)' : 'var(--text-muted)',
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ fontWeight: 600 }}>{f.name}</div>
                <div style={{ color: 'var(--text-soft)', fontSize: 12 }}>
                  {f.child_count} детей
                </div>
                <div style={{ textAlign: 'right', fontWeight: 600 }}>
                  {f.task_count} задач
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 16,
        letterSpacing: '-0.01em',
        margin: '0 0 12px',
        textTransform: 'uppercase',
        color: 'var(--text-soft)',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.08em',
      }}
    >
      {children}
    </h2>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'gold';
}) {
  return (
    <div
      style={{
        background: accent === 'gold' ? 'var(--color-gold-soft)' : 'var(--bg-surface)',
        border: `1px solid ${accent === 'gold' ? 'var(--color-gold)' : 'var(--border-soft)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-soft)',
          fontWeight: 600,
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 24,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
        }}
      >
        {typeof value === 'number' ? value.toLocaleString('ru-RU') : value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

function FunnelStage({
  label,
  value,
  pct,
  drop,
  isFirst,
}: {
  label: string;
  value: number;
  pct: number;
  drop: number;
  isFirst: boolean;
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-soft)' }}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: 'var(--text-primary)' }}>{value}</b>
          {' · '}{pct}%
          {drop > 0 && <span style={{ color: 'var(--color-coral)', fontWeight: 600, marginLeft: 6 }}>−{drop}</span>}
        </span>
      </div>
      <div style={{ height: 8, background: 'var(--bg-surface-2)', borderRadius: 100, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${Math.max(pct, 2)}%`,
            background: isFirst ? 'var(--color-ink)' : 'linear-gradient(90deg, var(--color-coral), var(--color-gold))',
            borderRadius: 100,
          }}
        />
      </div>
    </div>
  );
}

function AlertCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: number;
  hint: string;
  accent: 'coral' | 'gold';
}) {
  const bg = accent === 'coral' ? 'var(--color-coral)' : 'var(--color-gold)';
  const fg = accent === 'coral' ? 'white' : 'var(--color-ink)';
  return (
    <div
      style={{
        background: bg,
        color: fg,
        borderRadius: 'var(--radius-xl)',
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          opacity: 0.85,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{hint}</div>
    </div>
  );
}

function formatCash(n: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}
