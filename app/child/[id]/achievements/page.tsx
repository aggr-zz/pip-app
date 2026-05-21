import { notFound } from 'next/navigation';
import { getChildContext } from '@/lib/getChildContext';
import {
  ACHIEVEMENTS,
  ALL_ACHIEVEMENT_TYPES,
  CATEGORY_LABELS,
  type AchievementType,
} from '@/lib/achievements';

type Profile = {
  id: string;
  family_id: string;
  role: 'parent' | 'child';
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  balance: number;
  current_streak: number;
};

type Achievement = {
  type: string;
  unlocked_at: string;
};

type ChildStats = {
  tasks: number;    // total approved completions
  coins: number;    // total earned PIP (cumulative)
  streak: number;   // current streak
  rewards: number;  // fulfilled reward orders
};

export default async function AchievementsPage({
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

  // ── Achievements ────────────────────────────────────────────────────────
  const { data: unlocked = [] } = await supabase
    .from('achievements')
    .select('type, unlocked_at')
    .eq('profile_id', child.id)
    .returns<Achievement[]>();

  const unlockedMap = new Map((unlocked ?? []).map((a) => [a.type, a.unlocked_at]));
  const unlockedCount = unlockedMap.size;
  const totalCount = ALL_ACHIEVEMENT_TYPES.length;

  // ── Stats for progress bars ─────────────────────────────────────────────
  const { data: completions } = await supabase
    .from('task_completions')
    .select('awarded_coins')
    .eq('profile_id', child.id)
    .in('status', ['approved', 'auto_approved']);

  const tasksCompleted = completions?.length ?? 0;
  const coinsEarned = completions?.reduce((sum, r) => sum + (r.awarded_coins ?? 0), 0) ?? 0;

  const { count: rewardsCount } = await supabase
    .from('reward_orders')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', child.id)
    .eq('status', 'fulfilled');

  const stats: ChildStats = {
    tasks: tasksCompleted,
    coins: coinsEarned,
    streak: child.current_streak,
    rewards: rewardsCount ?? 0,
  };

  // ── Group by category ───────────────────────────────────────────────────
  const byCategory: Record<string, AchievementType[]> = {
    tasks: [],
    streak: [],
    coins: [],
    rewards: [],
  };
  for (const type of ALL_ACHIEVEMENT_TYPES) {
    byCategory[ACHIEVEMENTS[type].category].push(type);
  }

  // ── Recently unlocked (last 24h) ────────────────────────────────────────
  const dayAgo = Date.now() - 86400 * 1000;
  const recentlyUnlocked = (unlocked ?? []).filter(
    (a) => new Date(a.unlocked_at).getTime() > dayAgo,
  );

  return (
    <main style={{ minHeight: '100%', padding: '20px 20px 24px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Hero */}
        <section
          style={{
            background: 'linear-gradient(135deg, var(--color-coral) 0%, var(--color-gold) 100%)',
            color: 'white',
            borderRadius: 'var(--radius-2xl)',
            padding: 24,
            marginBottom: 24,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 10, left: 16, fontSize: 22, opacity: 0.4 }}>✨</div>
          <div style={{ position: 'absolute', bottom: 12, right: 14, fontSize: 18, opacity: 0.4 }}>⭐</div>
          <div style={{ position: 'absolute', top: 20, right: 30, fontSize: 16, opacity: 0.3 }}>💫</div>

          <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 28,
              letterSpacing: '-0.015em',
              lineHeight: 1.1,
            }}
          >
            Достижения {child.name}
          </div>
          <div style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}>
            {unlockedCount} из {totalCount} разблокировано
          </div>

          {/* Overall progress bar */}
          <div
            style={{
              marginTop: 14,
              height: 6,
              background: 'rgba(255, 255, 255, 0.25)',
              borderRadius: 100,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%`,
                background: 'white',
                borderRadius: 100,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </section>

        {/* Recently unlocked banner */}
        {recentlyUnlocked.length > 0 && (
          <div
            style={{
              background: 'var(--color-mint-soft)',
              border: '1px solid var(--color-mint)',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 28 }}>🎉</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-mint-deep)' }}>
                Новое за сутки: {recentlyUnlocked.length}
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-mint-deep)', opacity: 0.85, marginTop: 2 }}>
                {recentlyUnlocked
                  .slice(0, 3)
                  .map((a) => ACHIEVEMENTS[a.type as AchievementType]?.title)
                  .filter(Boolean)
                  .join(', ')}
                {recentlyUnlocked.length > 3 ? '…' : ''}
              </div>
            </div>
          </div>
        )}

        {/* Sections by category */}
        {(['tasks', 'streak', 'coins', 'rewards'] as const).map((cat) => {
          const types = byCategory[cat];
          if (types.length === 0) return null;
          return (
            <section key={cat} style={{ marginBottom: 28 }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 16,
                  letterSpacing: '-0.01em',
                  margin: '0 0 12px',
                }}
              >
                {CATEGORY_LABELS[cat]}
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 10,
                }}
              >
                {types.map((type) => {
                  const meta = ACHIEVEMENTS[type];
                  const unlockedAt = unlockedMap.get(type);
                  const isUnlocked = Boolean(unlockedAt);

                  // Progress bar values
                  const current = Math.min(stats[meta.metric], meta.goal);
                  const pct = meta.goal > 0 ? (current / meta.goal) * 100 : 0;
                  const inProgress = !isUnlocked && pct > 0;

                  // Visual state
                  const cardBg = isUnlocked
                    ? 'linear-gradient(135deg, var(--color-gold-soft) 0%, rgba(255,255,255,0) 60%), var(--bg-surface)'
                    : 'var(--bg-surface-2)';
                  const cardBorder = isUnlocked
                    ? '1.5px solid var(--color-gold)'
                    : inProgress
                      ? '1.5px solid var(--color-coral)'
                      : '1px dashed var(--border-default)';
                  const cardShadow = isUnlocked
                    ? '0 4px 18px rgba(242, 193, 78, 0.22)'
                    : inProgress
                      ? '0 2px 10px rgba(238, 108, 77, 0.12)'
                      : 'none';

                  return (
                    <div
                      key={type}
                      style={{
                        background: cardBg,
                        border: cardBorder,
                        borderRadius: 'var(--radius-xl)',
                        padding: '14px 14px 12px',
                        textAlign: 'center',
                        position: 'relative',
                        boxShadow: cardShadow,
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 40,
                          marginBottom: 6,
                          filter: isUnlocked || inProgress ? 'none' : 'grayscale(1)',
                          opacity: isUnlocked || inProgress ? 1 : 0.45,
                        }}
                      >
                        {meta.icon}
                      </div>
                      <div
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontWeight: 600,
                          fontSize: 13.5,
                          marginBottom: 2,
                          lineHeight: 1.2,
                          color: isUnlocked
                            ? 'var(--color-gold-deep)'
                            : inProgress
                              ? 'var(--color-coral)'
                              : 'var(--text-primary)',
                          opacity: isUnlocked || inProgress ? 1 : 0.55,
                        }}
                      >
                        {meta.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-soft)',
                          lineHeight: 1.35,
                          opacity: isUnlocked || inProgress ? 0.85 : 0.5,
                          flex: 1,
                        }}
                      >
                        {meta.description}
                      </div>

                      {/* Unlocked date */}
                      {isUnlocked && unlockedAt && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 10,
                            color: 'var(--color-gold-deep)',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          ✓ {formatDate(unlockedAt)}
                        </div>
                      )}

                      {/* Progress bar (locked achievements with some progress) */}
                      {!isUnlocked && (
                        <div style={{ marginTop: 10 }}>
                          {inProgress && (
                            <div
                              style={{
                                fontSize: 10,
                                color: 'var(--color-coral)',
                                marginBottom: 4,
                                fontWeight: 700,
                              }}
                            >
                              {current} / {meta.goal}
                            </div>
                          )}
                          <div
                            style={{
                              height: 4,
                              background: 'var(--border-default)',
                              borderRadius: 100,
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: pct > 0
                                  ? 'linear-gradient(90deg, var(--color-coral), var(--color-gold))'
                                  : 'transparent',
                                borderRadius: 100,
                                transition: 'width 0.4s ease',
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Unlocked badge overlay */}
                      {isUnlocked && (
                        <div
                          aria-hidden
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 18,
                            height: 18,
                            borderRadius: '50%',
                            background: 'var(--color-gold)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(d);
}
