import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinDot } from '@/components/ui/Coin';
import { AdjustForm } from './AdjustForm';

type Profile = {
  id: string;
  family_id: string;
  role: 'parent' | 'child';
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  balance: number;
};

type AdjustTx = {
  id: string;
  amount: number;
  reason: string | null;
  created_at: string;
};

export default async function AdjustPage({
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

  // Последние 10 ручных корректировок
  const { data: history = [] } = await supabase
    .from('transactions')
    .select('id, amount, reason, created_at')
    .eq('profile_id', child.id)
    .eq('type', 'manual_adjustment')
    .order('created_at', { ascending: false })
    .limit(10)
    .returns<AdjustTx[]>();

  return (
    <main style={{ minHeight: '100%', padding: '40px 24px 64px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
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
          <PipLogo size={28} href="/parent" />
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
              Корректировка
            </h1>
            <div
              style={{
                fontSize: 13,
                color: 'var(--text-soft)',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CoinDot size={10} />
              Баланс {child.name}: <strong style={{ color: 'var(--text-primary)' }}>{child.balance} PIP</strong>
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div
          style={{
            background: 'var(--bg-surface-2)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            fontSize: 12.5,
            color: 'var(--text-soft)',
            lineHeight: 1.55,
            marginBottom: 20,
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Когда использовать:</strong> бонус за то,
          что выходит за рамки задач («помог соседке»), штраф за поведение,
          или исправление ошибки. Запись остаётся в истории — ребёнок видит её и причину.
          Лимит — ±500 PIP за раз.
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
          <AdjustForm
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
              fontSize: 16,
              letterSpacing: '-0.01em',
              margin: '0 0 12px',
            }}
          >
            Прошлые корректировки
          </h2>

          {(!history || history.length === 0) ? (
            <div
              style={{
                padding: '24px',
                background: 'var(--bg-surface)',
                border: '1px dashed var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                textAlign: 'center',
                color: 'var(--text-soft)',
                fontSize: 13,
              }}
            >
              Ещё не было корректировок
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
                      width: 42,
                      height: 42,
                      borderRadius: 'var(--radius-md)',
                      background:
                        tx.amount > 0
                          ? 'var(--color-mint-soft)'
                          : 'var(--status-danger-soft)',
                      color:
                        tx.amount > 0 ? 'var(--color-mint-deep)' : 'var(--status-danger)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: 14, lineHeight: 1.3 }}>
                      {tx.reason || 'без причины'}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 2 }}>
                      {formatDate(tx.created_at)}
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

function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
