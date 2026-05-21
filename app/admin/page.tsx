import Link from 'next/link';
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

type SignupRow = {
  day: string;
  families_count: number;
  waitlist_count: number;
};

export default async function AdminHomePage() {
  const { supabase } = await requireAdmin('/admin');

  const [{ data: statsRows }, { data: signupRows }] = await Promise.all([
    supabase.rpc('admin_stats_overview').returns<StatsRow[]>(),
    supabase.rpc('admin_recent_signups').returns<SignupRow[]>(),
  ]);

  const stats = (statsRows && statsRows[0]) || null;
  const signups = signupRows ?? [];

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
        Обзор системы
      </h1>
      <p style={{ color: 'var(--text-soft)', fontSize: 14.5, margin: '0 0 28px', lineHeight: 1.5 }}>
        Что происходит в проде прямо сейчас
      </p>

      {/* Big stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 32,
        }}
      >
        <BigStat label="Семей" value={stats?.total_families ?? 0} accent="ink" />
        <BigStat label="Активных за 7 дней" value={stats?.active_families_7d ?? 0} accent="mint" />
        <BigStat label="Детей" value={stats?.total_children ?? 0} accent="coral" />
        <BigStat label="Waitlist" value={stats?.total_waitlist ?? 0} accent="gold" />
      </div>

      {/* Quick links */}
      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Быстрый доступ</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
          <QuickLink
            href="/admin/families"
            title="Семьи"
            sub={`${stats?.total_families ?? 0} зарегистрированных`}
            icon="👨‍👩‍👧‍👦"
          />
          <QuickLink
            href="/admin/waitlist"
            title="Waitlist"
            sub={`${stats?.total_waitlist ?? 0} email-ов`}
            icon="📋"
          />
          <QuickLink
            href="/admin/stats"
            title="Статистика"
            sub="Метрики использования"
            icon="📊"
          />
        </div>
      </section>

      {/* Activity */}
      <section style={{ marginBottom: 32 }}>
        <SectionTitle>Активность</SectionTitle>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 10,
          }}
        >
          <MiniMetric label="Всего задач" value={stats?.total_tasks ?? 0} />
          <MiniMetric label="Выполнений" value={stats?.total_completions ?? 0} />
          <MiniMetric label="Наград в каталогах" value={stats?.total_rewards ?? 0} />
          <MiniMetric label="Заказов выдано" value={stats?.total_orders_fulfilled ?? 0} />
          <MiniMetric label="PIP в обороте" value={Number(stats?.total_pip_in_circulation ?? 0).toLocaleString('ru-RU')} />
          <MiniMetric
            label="Выдано наличными"
            value={`${formatCash(Number(stats?.total_cash_paid ?? 0))} ₽`}
          />
        </div>
      </section>

      {/* Signups by day */}
      {signups.length > 0 && (
        <section>
          <SectionTitle>Регистрации за 14 дней</SectionTitle>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr 1fr',
                padding: '10px 16px',
                background: 'var(--bg-surface-2)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-soft)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid var(--border-soft)',
              }}
            >
              <div>Дата</div>
              <div>Семьи</div>
              <div>Waitlist</div>
            </div>
            {signups.map((row) => (
              <div
                key={row.day}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 1fr',
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-soft)',
                  fontSize: 13.5,
                }}
              >
                <div style={{ color: 'var(--text-soft)' }}>{formatDate(row.day)}</div>
                <div style={{ fontWeight: row.families_count > 0 ? 600 : 400 }}>
                  {row.families_count || '—'}
                </div>
                <div style={{ fontWeight: row.waitlist_count > 0 ? 600 : 400 }}>
                  {row.waitlist_count || '—'}
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
        fontSize: 18,
        letterSpacing: '-0.01em',
        margin: '0 0 12px',
      }}
    >
      {children}
    </h2>
  );
}

function BigStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: 'ink' | 'mint' | 'coral' | 'gold';
}) {
  const bgMap = {
    ink: { bg: 'var(--color-ink)', fg: 'white' },
    mint: { bg: 'var(--color-mint)', fg: 'white' },
    coral: { bg: 'var(--color-coral)', fg: 'white' },
    gold: { bg: 'var(--color-gold)', fg: 'var(--color-ink)' },
  };
  const { bg, fg } = bgMap[accent];
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
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
          opacity: 0.8,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 32,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value.toLocaleString('ru-RU')}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
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
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
    </div>
  );
}

function QuickLink({
  href,
  title,
  sub,
  icon,
}: {
  href: string;
  title: string;
  sub: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-xl)',
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        transition: 'border-color 0.15s',
      }}
    >
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>{sub}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

function formatCash(n: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(d);
}
