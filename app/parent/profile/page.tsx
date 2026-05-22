import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/ui/Avatar';
import { PipLogo } from '@/components/ui/PipLogo';
import { SignOutButton } from '../SignOutButton';

type Profile = {
  id: string;
  family_id: string;
  name: string;
  role: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  avatar_emoji: string | null;
  avatar_url: string | null;
  balance: number;
  current_streak: number;
  longest_streak: number;
};

function daysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

export default async function ParentProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single<Profile>();
  if (!me || me.role !== 'parent') redirect('/');

  const { data: family } = await supabase
    .from('families')
    .select('name')
    .eq('id', me.family_id)
    .single();

  // Children
  const { data: children = [] } = await supabase
    .from('profiles')
    .select('*')
    .eq('family_id', me.family_id)
    .eq('role', 'child')
    .is('archived_at', null)
    .order('name')
    .returns<Profile[]>();

  const childIds = (children ?? []).map((c) => c.id);

  // ── Family stats ─────────────────────────────────────────────────────────
  let totalTasksDone = 0;
  let totalPipEarned = 0;
  let totalRewardsFulfilled = 0;
  let tasksCount = 0;
  let rewardsCount = 0;

  if (childIds.length > 0) {
    const { data: completions } = await supabase
      .from('task_completions')
      .select('awarded_coins')
      .in('profile_id', childIds)
      .in('status', ['approved', 'auto_approved']);

    totalTasksDone = completions?.length ?? 0;
    totalPipEarned = completions?.reduce((s, r) => s + (r.awarded_coins ?? 0), 0) ?? 0;

    const { count: rfc } = await supabase
      .from('reward_orders')
      .select('id', { count: 'exact', head: true })
      .in('profile_id', childIds)
      .eq('status', 'fulfilled');
    totalRewardsFulfilled = rfc ?? 0;
  }

  const { count: tc } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', me.family_id)
    .is('archived_at', null);
  tasksCount = tc ?? 0;

  const { count: rc } = await supabase
    .from('rewards')
    .select('id', { count: 'exact', head: true })
    .eq('family_id', me.family_id)
    .is('archived_at', null);
  rewardsCount = rc ?? 0;

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
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}>Профиль</span>
        <div style={{ width: 26 }} />
      </header>

      <div style={{ padding: '20px 16px 40px', maxWidth: 600, margin: '0 auto' }}>

        {/* ── Family hero ──────────────────────────────────────────── */}
        <div
          style={{
            background: 'linear-gradient(135deg, var(--color-coral) 0%, var(--color-gold) 100%)',
            borderRadius: 'var(--radius-2xl)',
            padding: '24px 20px',
            marginBottom: 20,
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div aria-hidden style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
          <div aria-hidden style={{ position: 'absolute', bottom: -10, left: -15, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />

          <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>Семья</div>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26,
            letterSpacing: '-0.02em', marginBottom: 6,
          }}>
            {family?.name ?? 'Наша семья'}
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, opacity: 0.9 }}>
            <span>👨‍👩‍👧 {(children ?? []).length} {(children ?? []).length === 1 ? 'ребёнок' : 'детей'}</span>
            <span>📋 {tasksCount} заданий</span>
            <span>🎁 {rewardsCount} наград</span>
          </div>
        </div>

        {/* ── Stats grid ──────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <StatCard label="Выполнено" value={totalTasksDone} emoji="✅" />
          <StatCard label="PIP заработано" value={totalPipEarned} emoji="🪙" />
          <StatCard label="Наград выдано" value={totalRewardsFulfilled} emoji="🎁" />
        </div>

        {/* ── Children list ────────────────────────────────────────── */}
        {(children ?? []).length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17,
              letterSpacing: '-0.01em', margin: '0 0 12px',
            }}>
              Дети
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(children ?? []).map((child) => (
                <a
                  key={child.id}
                  href={`/parent/children/${child.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '12px 16px',
                    textDecoration: 'none',
                  }}
                >
                  <Avatar
                    name={child.name}
                    color={child.avatar_color}
                    avatarEmoji={child.avatar_emoji}
                    avatarUrl={child.avatar_url}
                    size="md"
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                      {child.name}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
                      🔥 Стрик {child.current_streak} {daysWord(child.current_streak)} · 💰 {child.balance} PIP
                    </div>
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </a>
              ))}
            </div>

            <a
              href="/parent/children/new"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginTop: 10, height: 44,
                background: 'var(--bg-surface)', border: '1px dashed var(--border-default)',
                borderRadius: 'var(--radius-lg)', color: 'var(--text-soft)',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
              }}
            >
              + Добавить ребёнка
            </a>
          </section>
        )}

        {/* ── Links ────────────────────────────────────────────────── */}
        <section style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17,
            letterSpacing: '-0.01em', margin: '0 0 12px',
          }}>
            Управление
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { href: '/parent/stats', label: '📊 Статистика семьи' },
              { href: '/parent/tasks', label: '📋 Все задания' },
              { href: '/parent/rewards', label: '🎁 Каталог наград' },
              { href: '/parent/orders', label: '🛍 История заказов' },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-lg)', textDecoration: 'none',
                  color: 'var(--text-primary)', fontSize: 14, fontWeight: 500,
                }}
              >
                {link.label}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </a>
            ))}
          </div>
        </section>

        {/* ── Sign out ─────────────────────────────────────────────── */}
        <SignOutButton fullWidth />
      </div>
    </main>
  );
}

function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-soft)',
      borderRadius: 'var(--radius-xl)',
      padding: '14px 12px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</div>
      <div style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20,
        letterSpacing: '-0.02em', lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--text-soft)', marginTop: 4, fontWeight: 500, lineHeight: 1.3 }}>
        {label}
      </div>
    </div>
  );
}
