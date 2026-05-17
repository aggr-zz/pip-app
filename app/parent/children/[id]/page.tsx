import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { EnterChildMode } from './EnterChildMode';

type Profile = {
  id: string;
  family_id: string;
  role: 'parent' | 'child';
  name: string;
  birth_year: number | null;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  balance: number;
  current_streak: number;
  longest_streak: number;
};

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Текущий родитель
  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') redirect('/');

  // Профиль ребёнка
  const { data: child } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single<Profile>();

  if (!child || child.family_id !== me.family_id || child.role !== 'child') {
    notFound();
  }

  const age = child.birth_year ? new Date().getFullYear() - child.birth_year : null;

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Header */}
        <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
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
          <PipLogo size={26} />
        </header>

        {/* Child hero card */}
        <section
          style={{
            background: 'var(--color-ink)',
            color: 'white',
            borderRadius: 'var(--radius-2xl)',
            padding: '24px',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <Avatar name={child.name} color={child.avatar_color} size="xl" />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 26,
                  letterSpacing: '-0.015em',
                  lineHeight: 1.1,
                }}
              >
                {child.name}
              </div>
              {age !== null && (
                <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>{age} {ageWord(age)}</div>
              )}
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 22,
                  color: 'var(--color-gold)',
                }}
              >
                {child.balance}
              </div>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.65,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: 2,
                }}
              >
                Баланс pip
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>
                {child.current_streak} 🔥
              </div>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.65,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: 2,
                }}
              >
                Стрик
              </div>
            </div>
          </div>
        </section>

        {/* Enter child mode (client component с PIN) */}
        <EnterChildMode childId={child.id} childName={child.name} />

        {/* Cash payout link */}
        <Link
          href={`/parent/children/${child.id}/cash`}
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-xl)',
            padding: '14px 16px',
            transition: 'border-color 0.15s',
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
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Выдача наличных</div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
              Записать обмен pip на ₽
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>

        {/* Manual adjustment link */}
        <Link
          href={`/parent/children/${child.id}/adjust`}
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-xl)',
            padding: '14px 16px',
            transition: 'border-color 0.15s',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-gold-soft)',
              color: 'var(--color-gold-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Корректировка баланса</div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
              Бонус или штраф, ±500 pip
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        <section
          style={{
            marginTop: 24,
            padding: '20px',
            background: 'var(--bg-surface-2)',
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            fontSize: 13,
            color: 'var(--text-soft)',
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: 'var(--text-primary)' }}>Скоро:</strong> вкладки
          с историей задач, заказов и достижений (Sprint 7).
        </section>
      </div>
    </main>
  );
}

function ageWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'год';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'года';
  return 'лет';
}
