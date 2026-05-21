import { notFound } from 'next/navigation';
import { getChildContext } from '@/lib/getChildContext';
import { ChildAvatarButton } from '../ChildAvatarButton';
import { ExitChildButton } from '../ExitChildButton';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { ALL_ACHIEVEMENT_TYPES } from '@/lib/achievements';

type Profile = {
  id: string;
  family_id: string;
  role: string;
  name: string;
  balance: number;
  current_streak: number;
  longest_streak: number;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  avatar_emoji: string | null;
  avatar_url: string | null;
};

export default async function ChildProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db: supabase, familyId } = await getChildContext(id);

  const { data: child } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single<Profile>();

  if (!child || child.family_id !== familyId || child.role !== 'child') notFound();

  // Stats
  const { data: completions } = await supabase
    .from('task_completions')
    .select('awarded_coins')
    .eq('profile_id', id)
    .in('status', ['approved', 'auto_approved']);

  const tasksTotal = completions?.length ?? 0;
  const coinsEarned = completions?.reduce((s, r) => s + (r.awarded_coins ?? 0), 0) ?? 0;

  const { count: achievementsCount = 0 } = await supabase
    .from('achievements')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', id);

  const totalAchievements = ALL_ACHIEVEMENT_TYPES.length;

  return (
    <main style={{ minHeight: '100%', padding: '32px 20px 40px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <ChildAvatarButton
            profileId={child.id}
            familyId={child.family_id}
            name={child.name}
            avatarColor={child.avatar_color}
            avatarEmoji={child.avatar_emoji}
            avatarUrl={child.avatar_url}
          />
          <div
            style={{
              marginTop: 14,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: '-0.015em',
            }}
          >
            {child.name}
          </div>
          <div style={{ marginTop: 6 }}>
            <StreakBadge streak={child.current_streak} />
          </div>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 28,
          }}
        >
          <StatCard label="Задач" value={tasksTotal} />
          <StatCard label="Заработано" value={coinsEarned} unit="PIP" />
          <StatCard label="Ачивки" value={`${achievementsCount ?? 0}/${totalAchievements}`} />
        </div>

        {/* Longest streak */}
        {child.longest_streak > 0 && (
          <div
            style={{
              background: 'var(--color-gold-soft)',
              border: '1px solid var(--color-gold)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              marginBottom: 28,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ fontSize: 28 }}>🔥</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-gold-deep)' }}>
                Лучший стрик: {child.longest_streak} {daysWord(child.longest_streak)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-gold-deep)', opacity: 0.75, marginTop: 2 }}>
                Текущий: {child.current_streak} {daysWord(child.current_streak)}
              </div>
            </div>
          </div>
        )}

        {/* Exit button */}
        <div style={{ marginTop: 8 }}>
          <ExitChildButton fullWidth />
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-xl)',
        padding: '14px 12px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {value}
        {unit && (
          <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 2, opacity: 0.7 }}> {unit}</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 4, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

function daysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}
