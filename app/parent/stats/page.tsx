import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinDot } from '@/components/ui/Coin';
import { TaskIcon, type TaskIconName } from '@/components/ui/TaskIcon';

type Period = 'week' | 'month' | 'all';

type FamilyStatsRow = {
  profile_id: string;
  profile_name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  current_balance: number;
  tasks_completed: number;
  coins_earned: number;
  coins_spent: number;
  cash_paid_out: number;
  currency: string;
};

type TopTaskRow = {
  task_id: string;
  title: string;
  icon: TaskIconName;
  completions: number;
  total_earned: number;
};

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const params = await searchParams;
  const period: Period =
    params.period === 'week' ? 'week' :
    params.period === 'all' ? 'all' : 'month';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();
  if (!me || me.role !== 'parent') redirect('/');

  // since timestamp
  const since = periodSince(period);

  const [{ data: stats = [] }, { data: topTasks = [] }] = await Promise.all([
    supabase
      .rpc('family_stats', { p_family_id: me.family_id, p_since: since })
      .returns<FamilyStatsRow[]>(),
    supabase
      .rpc('top_tasks', { p_family_id: me.family_id, p_since: since })
      .returns<TopTaskRow[]>(),
  ]);

  const familyTotals = (stats ?? []).reduce(
    (acc, r) => ({
      tasks: acc.tasks + r.tasks_completed,
      earned: acc.earned + r.coins_earned,
      spent: acc.spent + r.coins_spent,
      cash: acc.cash + (typeof r.cash_paid_out === 'number' ? r.cash_paid_out : Number(r.cash_paid_out) || 0),
    }),
    { tasks: 0, earned: 0, spent: 0, cash: 0 },
  );

  return (
    <main style={{ minHeight: '100%', padding: '40px 24px 64px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
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
          <PipLogo size={28} href="/parent" />
        </header>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 32,
            letterSpacing: '-0.02em',
            margin: '0 0 4px',
            lineHeight: 1.05,
          }}
        >
          Статистика
        </h1>
        <p style={{ color: 'var(--text-soft)', fontSize: 14.5, margin: '0 0 20px', lineHeight: 1.5 }}>
          Как семья пользуется PIP
        </p>

        {/* Period tabs */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-pill)',
            padding: 4,
            marginBottom: 24,
          }}
        >
          {([
            ['week', 'Неделя'],
            ['month', 'Месяц'],
            ['all', 'Всё время'],
          ] as const).map(([key, label]) => (
            <Link
              key={key}
              href={`/parent/stats?period=${key}`}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-pill)',
                fontSize: 13,
                fontWeight: 600,
                background: period === key ? 'var(--color-ink)' : 'transparent',
                color: period === key ? 'white' : 'var(--text-soft)',
                transition: 'background 0.15s',
              }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Family totals */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
            marginBottom: 28,
          }}
        >
          <BigStat label="Задач выполнено" value={String(familyTotals.tasks)} />
          <BigStat label="Заработано" value={`${familyTotals.earned}`} unit="PIP" />
          <BigStat label="Потрачено в магазине" value={`${familyTotals.spent}`} unit="PIP" />
          <BigStat label="Выдано наличными" value={`${formatCash(familyTotals.cash)}`} unit="₽" />
        </div>

        {/* Per-child */}
        {stats && stats.length > 0 ? (
          <section style={{ marginBottom: 28 }}>
            <h2 style={sectionTitleStyle}>По детям</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.map((s) => (
                <div
                  key={s.profile_id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--radius-xl)',
                    padding: 16,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Avatar name={s.profile_name} color={s.avatar_color} size="md" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{s.profile_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-soft)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <CoinDot size={9} />
                        баланс {s.current_balance} PIP
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    <MiniStat label="Задач" value={String(s.tasks_completed)} />
                    <MiniStat label="Получено" value={`+${s.coins_earned}`} color="var(--color-mint)" />
                    <MiniStat label="Потрачено" value={`−${s.coins_spent}`} color="var(--color-coral)" />
                    <MiniStat label="Наличными" value={`${formatCash(Number(s.cash_paid_out) || 0)}₽`} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section
            style={{
              padding: '40px 24px',
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-default)',
              borderRadius: 'var(--radius-2xl)',
              textAlign: 'center',
              marginBottom: 28,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>📊</div>
            <h2 style={{ ...sectionTitleStyle, textAlign: 'center', margin: '0 0 8px' }}>Пока нет детей</h2>
            <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: 0 }}>
              Добавь ребёнка, чтобы появилась статистика.
            </p>
          </section>
        )}

        {/* Top tasks */}
        {topTasks && topTasks.length > 0 && (
          <section>
            <h2 style={sectionTitleStyle}>Топ задач</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {topTasks.map((t, i) => (
                <div
                  key={t.task_id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 14,
                      color: 'var(--text-muted)',
                      minWidth: 18,
                      textAlign: 'center',
                    }}
                  >
                    {i + 1}
                  </span>
                  <TaskIcon name={t.icon} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 1 }}>
                      {t.completions} раз · {t.total_earned} PIP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function periodSince(period: Period): string {
  if (period === 'all') return '1970-01-01T00:00:00Z';
  const days = period === 'week' ? 7 : 30;
  const d = new Date(Date.now() - days * 86400 * 1000);
  return d.toISOString();
}

function formatCash(n: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 18,
  letterSpacing: '-0.01em',
  margin: '0 0 12px',
};

function BigStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-xl)',
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-soft)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 600,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-soft)', marginLeft: 4 }}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 15,
          color: color || 'var(--text-primary)',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{label}</div>
    </div>
  );
}
