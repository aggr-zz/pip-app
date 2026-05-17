import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getActiveChildId } from '@/app/parent/children/actions';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinDot } from '@/components/ui/Coin';
import { ExitChildButton } from '../ExitChildButton';

type Profile = {
  id: string;
  family_id: string;
  role: 'parent' | 'child';
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  balance: number;
  current_streak: number;
  longest_streak: number;
};

type Tx = {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  cash_amount: number | null;
  reason: string | null;
  created_at: string;
};

type RejectedCompletion = {
  id: string;
  rejection_reason: string | null;
  approved_at: string | null;
  task: {
    title: string;
    icon: string;
  } | null;
};

export default async function ChildHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const activeChildId = await getActiveChildId();
  if (activeChildId !== id) {
    redirect(`/parent/children/${id}`);
  }

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id')
    .eq('user_id', user.id)
    .single();
  if (!me) redirect('/');

  const { data: child } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single<Profile>();
  if (!child || child.family_id !== me.family_id || child.role !== 'child') notFound();

  // Последние 30 транзакций
  const { data: transactions = [] } = await supabase
    .from('transactions')
    .select('id, type, amount, balance_after, cash_amount, reason, created_at')
    .eq('profile_id', child.id)
    .order('created_at', { ascending: false })
    .limit(30)
    .returns<Tx[]>();

  // Реджектнутые выполнения (чтобы ребёнок видел причину и понимал)
  // Получаем completion и task отдельно, объединяем в TS
  const { data: rejRows = [] } = await supabase
    .from('task_completions')
    .select('id, task_id, rejection_reason, approved_at')
    .eq('profile_id', child.id)
    .eq('status', 'rejected')
    .order('approved_at', { ascending: false })
    .limit(10);

  const taskIds = (rejRows ?? []).map((r) => r.task_id);
  const { data: tasks = [] } = taskIds.length > 0
    ? await supabase.from('tasks').select('id, title, icon').in('id', taskIds)
    : { data: [] };

  const taskById = new Map((tasks ?? []).map((t) => [t.id, t]));
  const rejected: RejectedCompletion[] = (rejRows ?? []).map((r) => ({
    id: r.id,
    rejection_reason: r.rejection_reason,
    approved_at: r.approved_at,
    task: taskById.get(r.task_id) ?? null,
  }));

  return (
    <main style={{ minHeight: '100vh', padding: '20px 20px 40px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <Link
            href={`/child/${child.id}`}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Avatar name={child.name} color={child.avatar_color} size="md" />
            <ExitChildButton />
          </div>
        </header>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: '-0.015em',
            margin: '0 0 6px',
            lineHeight: 1.1,
          }}
        >
          История
        </h1>
        <p style={{ color: 'var(--text-soft)', fontSize: 13, margin: '0 0 20px' }}>
          Что у тебя происходило с pip
        </p>

        {/* Streak highlight */}
        <div
          style={{
            background: 'var(--color-gold-soft)',
            border: '1px solid var(--color-gold)',
            borderRadius: 'var(--radius-xl)',
            padding: 16,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div style={{ fontSize: 36 }}>🔥</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 22, fontFamily: 'var(--font-display)' }}>
              Стрик {child.current_streak}{' '}
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-soft)' }}>
                {dayWord(child.current_streak)}
              </span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-soft)', marginTop: 2 }}>
              {child.longest_streak > child.current_streak
                ? `Рекорд: ${child.longest_streak} ${dayWord(child.longest_streak)}`
                : 'Это твой лучший результат!'}
            </div>
          </div>
        </div>

        {/* Rejected — над transactions, чтобы привлечь внимание */}
        {rejected.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={sectionTitleStyle}>Отклонено родителем</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rejected.map((r) => (
                <div
                  key={r.id}
                  style={{
                    background: 'var(--status-danger-soft)',
                    border: '1px solid var(--status-danger)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{r.task?.icon ? '✗' : '✗'}</span>
                    <strong style={{ fontSize: 14, color: 'var(--status-danger)' }}>
                      {r.task?.title ?? 'Задача'}
                    </strong>
                    <span style={{ fontSize: 11, color: 'var(--text-soft)', marginLeft: 'auto' }}>
                      {r.approved_at ? timeAgo(r.approved_at) : ''}
                    </span>
                  </div>
                  {r.rejection_reason && (
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      «{r.rejection_reason}»
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Transactions feed */}
        <section>
          <h2 style={sectionTitleStyle}>Движение pip</h2>

          {transactions.length === 0 ? (
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
              Здесь будет всё что ты заработаешь и потратишь
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {transactions.map((tx) => (
                <TransactionRow key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function TransactionRow({ tx }: { tx: Tx }) {
  const isPositive = tx.amount > 0;
  const { icon, label } = txMeta(tx);

  return (
    <div
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
          width: 36,
          height: 36,
          borderRadius: 'var(--radius-md)',
          background: isPositive ? 'var(--color-mint-soft)' : 'var(--bg-surface-2)',
          color: isPositive ? 'var(--color-mint-deep)' : 'var(--text-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {tx.reason || label}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          {formatDate(tx.created_at)} · баланс {tx.balance_after}
          {tx.cash_amount && <> · {formatCash(Number(tx.cash_amount))} ₽</>}
        </div>
      </div>

      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 16,
          color: isPositive ? 'var(--color-mint-deep)' : 'var(--text-primary)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {isPositive ? '+' : ''}{tx.amount}
        <CoinDot size={11} />
      </div>
    </div>
  );
}

function txMeta(tx: Tx): { icon: string; label: string } {
  switch (tx.type) {
    case 'task_reward':       return { icon: '✓', label: 'Награда за задачу' };
    case 'reward_purchase':   return { icon: '🎁', label: 'Покупка награды' };
    case 'cash_payout':       return { icon: '💵', label: 'Обмен на наличные' };
    case 'refund':            return { icon: '↩', label: 'Возврат' };
    case 'bonus':             return { icon: '⭐', label: 'Бонус' };
    case 'manual_adjustment': return { icon: '⚙', label: 'Корректировка' };
    default:                  return { icon: '•', label: tx.type };
  }
}

function dayWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
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

function formatCash(n: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(n);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`;
}

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 16,
  letterSpacing: '-0.01em',
  margin: '0 0 10px',
};
