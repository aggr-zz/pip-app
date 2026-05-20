import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChildContext } from '@/lib/getChildContext';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { ExitChildButton } from '../ExitChildButton';
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

  const { data: unlocked = [] } = await supabase
    .from('achievements')
    .select('type, unlocked_at')
    .eq('profile_id', child.id)
    .returns<Achievement[]>();

  const unlockedMap = new Map((unlocked ?? []).map((a) => [a.type, a.unlocked_at]));
  const unlockedCount = unlockedMap.size;
  const totalCount = ALL_ACHIEVEMENT_TYPES.length;

  // Группируем по категориям
  const byCategory: Record<string, AchievementType[]> = {
    tasks: [],
    streak: [],
    coins: [],
    rewards: [],
  };
  for (const type of ALL_ACHIEVEMENT_TYPES) {
    byCategory[ACHIEVEMENTS[type].category].push(type);
  }

  // Недавно открытые (за последние 24 часа)
  const dayAgo = Date.now() - 86400 * 1000;
  const recentlyUnlocked = (unlocked ?? []).filter(
    (a) => new Date(a.unlocked_at).getTime() > dayAgo,
  );

  return (
    <main style={{ minHeight: '100vh', padding: '20px 20px 64px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <header style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
            <Avatar name={child.name} color={child.avatar_color} size="sm" />
            <ExitChildButton />
          </div>
        </header>

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
          {/* Decorative sparkles */}
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

          {/* Progress bar */}
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
                  return (
                    <div
                      key={type}
                      style={{
                        background: isUnlocked ? 'var(--bg-surface)' : 'var(--bg-surface-2)',
                        border: isUnlocked
                          ? '1px solid var(--color-gold)'
                          : '1px dashed var(--border-default)',
                        borderRadius: 'var(--radius-xl)',
                        padding: 14,
                        textAlign: 'center',
                        opacity: isUnlocked ? 1 : 0.55,
                        position: 'relative',
                        boxShadow: isUnlocked ? '0 4px 16px rgba(242, 193, 78, 0.18)' : 'none',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 40,
                          marginBottom: 6,
                          filter: isUnlocked ? 'none' : 'grayscale(1)',
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
                        }}
                      >
                        {meta.title}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--text-soft)',
                          lineHeight: 1.35,
                        }}
                      >
                        {meta.description}
                      </div>
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
