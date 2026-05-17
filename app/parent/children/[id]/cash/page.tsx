import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinDot } from '@/components/ui/Coin';
import { CashForm } from './CashForm';

type Profile = {
  id: string;
  family_id: string;
  role: 'parent' | 'child';
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  balance: number;
};

type CashTransaction = {
  id: string;
  amount: number;            // отрицательный pip
  cash_amount: number | null;
  currency: string | null;
  reason: string | null;
  created_at: string;
};

export default async function CashPage({
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

  const { data: child } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single<Profile>();
  if (!child || child.family_id !== me.family_id || child.role !== 'child') notFound();

  // История cash_payout
  const { data: history = [] } = await supabase
    .from('transactions')
    .select('id, amount, cash_amount, currency, reason, created_at')
    .eq('profile_id', child.id)
    .eq('type', 'cash_payout')
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<CashTransaction[]>();

  // Сводки
  const totalCash = (history ?? []).reduce(
    (s, t) => s + (t.cash_amount ? Number(t.cash_amount) : 0),
    0,
  );
  const totalPip = (history ?? []).reduce((s, t) => s + Math.abs(t.amount), 0);

  // За последние 30 дней
  const thirtyDaysAgo = Date.now() - 30 * 86400 * 1000;
  const last30 = (history ?? []).filter(
    (t) => new Date(t.created_at).getTime() >= thirtyDaysAgo,
  );
  const last30Cash = last30.reduce(
    (s, t) => s + (t.cash_amount ? Number(t.cash_amount) : 0),
    0,
  );

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px 64px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <header style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href={`/parent/children/${child.id}`}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
          <Avatar name={child.name} color={child.avatar_color} size="lg" />
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 28,
                letterSpacing: '-0.02em',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Выдача {child.name}
            </h1>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CoinDot size={10} />
              Баланс: <strong style={{ color: 'var(--text-primary)' }}>{child.balance} pip</strong>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <SummaryCard
            label="За 30 дней"
            value={`${formatCash(last30Cash)} ₽`}
            sublabel={`за ${last30.reduce((s, t) => s + Math.abs(t.amount), 0)} pip`}
          />
          <SummaryCard
            label="Всего"
            value={`${formatCash(totalCash)} ₽`}
            sublabel={`за ${totalPip} pip`}
          />
        </div>

        {/* Form */}
        <section
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-2xl)',
            padding: 20,
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: '-0.01em',
              margin: '0 0 4px',
            }}
          >
            Записать выдачу
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Деньги передаются вне приложения. Курс выбирай сам — pip ↔ ₽.
          </p>
          <CashForm
            childId={child.id}
            childName={child.name}
            currentBalance={child.balance}
          />
        </section>

        {/* History */}
        <section>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 18,
              letterSpacing: '-0.01em',
              margin: '0 0 12px',
            }}
          >
            История
          </h2>

          {history.length === 0 ? (
            <div
              style={{
                padding: '32px 20px',
                background: 'var(--bg-surface)',
                border: '1px dashed var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                textAlign: 'center',
                color: 'var(--text-soft)',
                fontSize: 14,
              }}
            >
              Ещё не было выдач
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {history.map((tx) => (
                <div
                  key={tx.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-mint-soft)',
                      color: 'var(--color-mint-deep)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {formatCash(Number(tx.cash_amount ?? 0))} {tx.currency || '₽'}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 2 }}>
                      {formatDate(tx.created_at)} · {Math.abs(tx.amount)} pip
                      {tx.reason && <> · {tx.reason}</>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string;
  sublabel: string;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: 14,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.015em', marginTop: 4 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sublabel}</div>
    </div>
  );
}

function formatCash(n: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(d);
}
