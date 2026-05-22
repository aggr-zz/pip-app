import { notFound } from 'next/navigation';
import { getChildContext } from '@/lib/getChildContext';
import { ChildAvatarButton } from '../ChildAvatarButton';
import { ExitChildButton } from '../ExitChildButton';
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

type TaskRow = { id: string; title: string; icon: string };
type FavoriteTask = TaskRow & { count: number };

const HERO_GRADIENTS: Record<string, string> = {
  coral: 'linear-gradient(150deg, #FFB997 0%, #EE6C4D 100%)',
  mint:  'linear-gradient(150deg, #95D5B2 0%, #5BA890 100%)',
  ink:   'linear-gradient(150deg, #3D4663 0%, #1B2238 100%)',
  gold:  'linear-gradient(150deg, #FFE39A 0%, #D4A12E 100%)',
  rose:  'linear-gradient(150deg, #FFC1CC 0%, #E27396 100%)',
  sky:   'linear-gradient(150deg, #B3DCFA 0%, #5B85C9 100%)',
};

function daysWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

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

  // ── Stats: completions ──────────────────────────────────────────────────
  const { data: completions } = await supabase
    .from('task_completions')
    .select('awarded_coins, task_id')
    .eq('profile_id', id)
    .in('status', ['approved', 'auto_approved']);

  const tasksTotal = completions?.length ?? 0;
  const coinsEarned = completions?.reduce((s, r) => s + (r.awarded_coins ?? 0), 0) ?? 0;

  // ── Achievements (reliable count via data fetch) ────────────────────────
  const { data: unlockedAchievements = [] } = await supabase
    .from('achievements')
    .select('type')
    .eq('profile_id', id);
  const achievementsCount = unlockedAchievements?.length ?? 0;
  const totalAchievements = ALL_ACHIEVEMENT_TYPES.length;

  // ── Favorite tasks ──────────────────────────────────────────────────────
  const freqMap = new Map<string, number>();
  for (const c of completions ?? []) {
    if (c.task_id) freqMap.set(c.task_id, (freqMap.get(c.task_id) ?? 0) + 1);
  }
  const topTaskIds = [...freqMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tid]) => tid);

  let favoriteTasks: FavoriteTask[] = [];
  if (topTaskIds.length > 0) {
    const { data: taskData } = await supabase
      .from('tasks')
      .select('id, title, icon')
      .in('id', topTaskIds)
      .returns<TaskRow[]>();
    favoriteTasks = topTaskIds
      .map((tid) => {
        const t = taskData?.find((task) => task.id === tid);
        if (!t) return null;
        return { id: tid, title: t.title, icon: t.icon, count: freqMap.get(tid)! };
      })
      .filter(Boolean) as FavoriteTask[];
  }

  const heroGradient = HERO_GRADIENTS[child.avatar_color] ?? HERO_GRADIENTS.coral;
  const inkHero = child.avatar_color === 'ink';

  return (
    <main style={{ minHeight: '100%' }}>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div
        style={{
          background: heroGradient,
          padding: '36px 20px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative circles */}
        <div aria-hidden style={{
          position: 'absolute', top: -24, right: -24,
          width: 140, height: 140, borderRadius: '50%',
          background: 'rgba(255,255,255,0.12)',
        }} />
        <div aria-hidden style={{
          position: 'absolute', bottom: -16, left: -20,
          width: 90, height: 90, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div aria-hidden style={{
          position: 'absolute', top: 16, left: 30,
          width: 50, height: 50, borderRadius: '50%',
          background: 'rgba(255,255,255,0.07)',
        }} />

        {/* Avatar with glow ring */}
        <div style={{
          padding: 5,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.3)',
          marginBottom: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}>
          <ChildAvatarButton
            profileId={child.id}
            familyId={child.family_id}
            name={child.name}
            avatarColor={child.avatar_color}
            avatarEmoji={child.avatar_emoji}
            avatarUrl={child.avatar_url}
            size="xl"
          />
        </div>

        {/* Name */}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '-0.015em',
            color: inkHero ? 'rgba(255,255,255,0.92)' : 'white',
            textShadow: '0 1px 4px rgba(0,0,0,0.15)',
            marginBottom: 6,
          }}
        >
          {child.name}
        </div>

        {/* Streak pill */}
        {child.current_streak > 0 && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'rgba(255,255,255,0.22)',
              borderRadius: 100,
              padding: '5px 14px 5px 10px',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              backdropFilter: 'blur(4px)',
            }}
          >
            <span style={{ fontSize: 14 }}>🔥</span>
            <span>Стрик {child.current_streak} {daysWord(child.current_streak)}</span>
          </div>
        )}
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 20px 40px', maxWidth: 480, margin: '0 auto' }}>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            marginBottom: 24,
          }}
        >
          <StatCard label="Задач" value={tasksTotal} />
          <StatCard label="Заработано" value={coinsEarned} unit="PIP" />
          <StatCard
            label="Ачивки"
            value={`${achievementsCount}/${totalAchievements}`}
          />
        </div>

        {/* Favorite tasks */}
        {favoriteTasks.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 15,
                letterSpacing: '-0.01em',
                margin: '0 0 10px',
                color: 'var(--text-primary)',
              }}
            >
              ⭐ Любимые задания
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {favoriteTasks.map((task, i) => (
                <div
                  key={task.id}
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
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: i === 0
                        ? 'var(--color-gold-soft)'
                        : i === 1
                          ? 'var(--color-coral-soft)'
                          : 'var(--bg-surface-2)',
                      border: i === 0
                        ? '1px solid var(--color-gold)'
                        : i === 1
                          ? '1px solid var(--color-coral)'
                          : '1px solid var(--border-default)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 800,
                      color: i === 0
                        ? 'var(--color-gold-deep)'
                        : i === 1
                          ? 'var(--color-coral)'
                          : 'var(--text-muted)',
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {task.title}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: 'var(--text-soft)',
                      flexShrink: 0,
                    }}
                  >
                    ×{task.count}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Longest streak */}
        {child.longest_streak > 0 && (
          <div
            style={{
              background: 'var(--color-gold-soft)',
              border: '1px solid var(--color-gold)',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 16px',
              marginBottom: 24,
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
        <ExitChildButton fullWidth />
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
