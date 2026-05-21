import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChildContext } from '@/lib/getChildContext';
import { PipLogo } from '@/components/ui/PipLogo';
import { CoinBalance } from '@/components/ui/Coin';
import { ExitChildButton } from './ExitChildButton';
import { ChildAvatarButton } from './ChildAvatarButton';
import { TaskRow } from './TaskRow';
import { HintBanner } from '@/components/ui/HintBanner';
import { StreakBadge } from '@/components/ui/StreakBadge';
import { isTaskScheduledFor, nowInTimezone, todayInTimezone, type ScheduleType } from '@/lib/schedule';
import { ALL_ACHIEVEMENT_TYPES } from '@/lib/achievements';
import type { TaskIconName } from '@/components/ui/TaskIcon';

type Profile = {
  id: string;
  family_id: string;
  role: 'parent' | 'child';
  name: string;
  birth_year: number | null;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  avatar_emoji: string | null;
  avatar_url: string | null;
  balance: number;
  current_streak: number;
};

type Task = {
  id: string;
  title: string;
  icon: TaskIconName;
  coin_value: number;
  schedule_type: ScheduleType;
  schedule_days: number[] | null;
  requires_approval: boolean;
  requires_photo: boolean;
  assigned_to: string[];
};

type TaskCompletion = {
  task_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
};

export default async function ChildHomePage({
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

  const { data: family } = await supabase
    .from('families')
    .select('timezone')
    .eq('id', familyId)
    .single();

  const tz = family?.timezone || 'Europe/Moscow';
  const today = todayInTimezone(tz);
  const dateInTz = nowInTimezone(tz);

  const { data: allTasks = [] } = await supabase
    .from('tasks')
    .select('id, title, icon, coin_value, schedule_type, schedule_days, requires_approval, requires_photo, assigned_to')
    .eq('family_id', familyId)
    .is('archived_at', null)
    .contains('assigned_to', [child.id])
    .returns<Task[]>();

  const todayTasks = (allTasks ?? []).filter((t) => isTaskScheduledFor(t, dateInTz));

  const taskIds = todayTasks.map((t) => t.id);
  let completions: TaskCompletion[] = [];
  if (taskIds.length > 0) {
    const { data: rows = [] } = await supabase
      .from('task_completions')
      .select('task_id, status')
      .eq('profile_id', child.id)
      .eq('scheduled_for', today)
      .in('task_id', taskIds)
      .returns<TaskCompletion[]>();
    completions = rows ?? [];
  }

  const statusByTaskId = new Map(completions.map((c) => [c.task_id, c.status]));
  const doneCount = completions.filter(
    (c) => c.status === 'approved' || c.status === 'auto_approved'
  ).length;
  const totalCount = todayTasks.length;
  const progress = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const availableCount = todayTasks.filter((t) => {
    const s = statusByTaskId.get(t.id);
    return !s || s === 'rejected';
  }).length;

  // Потенциальный заработок в неделю/месяц по всем заданиям
  const weeklyPotential = (allTasks ?? []).reduce((sum, t) => {
    if (t.schedule_type === 'daily') return sum + t.coin_value * 7;
    if (t.schedule_type === 'weekdays') return sum + t.coin_value * 5;
    if (t.schedule_type === 'custom') return sum + t.coin_value * (t.schedule_days?.length ?? 0);
    return sum; // once — не считаем
  }, 0);
  const monthlyPotential = Math.round(weeklyPotential * 4.3);

  // Achievements count (для бейджа в навигации)
  const { count: achievementsCount = 0 } = await supabase
    .from('achievements')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', child.id);
  const totalAchievements = ALL_ACHIEVEMENT_TYPES.length;

  return (
    <main style={{ minHeight: '100vh', padding: '20px 20px 40px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 24,
          }}
        >
          <PipLogo size={28} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ChildAvatarButton
                profileId={child.id}
                familyId={child.family_id}
                name={child.name}
                avatarColor={child.avatar_color}
                avatarEmoji={child.avatar_emoji}
                avatarUrl={child.avatar_url}
              />
            <ExitChildButton />
          </div>
        </header>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: '-0.015em',
            margin: '0 0 20px',
            lineHeight: 1.1,
          }}
        >
          Привет, {child.name}! 👋
        </h1>

        <CoinBalance
          amount={child.balance}
          label="Твой баланс"
          extra={
            <div style={{ fontSize: 13, opacity: 0.85 }}>
              <StreakBadge streak={child.current_streak} />
            </div>
          }
        />

        {totalCount > 0 && (
          <div style={{ marginTop: 24 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 8,
              }}
            >
              <div
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 16 }}
              >
                Сегодня
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                {doneCount} из {totalCount}
              </div>
            </div>
            <div
              style={{
                height: 6,
                background: 'var(--border-soft)',
                borderRadius: 100,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, var(--color-coral), var(--color-gold))',
                  borderRadius: 100,
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        )}

        <section style={{ marginTop: 20 }}>
          {todayTasks.length === 0 ? (
            <div
              style={{
                padding: '32px 20px',
                background: 'var(--bg-surface)',
                border: '1px dashed var(--border-default)',
                borderRadius: 'var(--radius-xl)',
                textAlign: 'center',
                color: 'var(--text-soft)',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>🌤️</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
                На сегодня заданий нет. Отдыхай!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {todayTasks.map((task) => {
                const compStatus = statusByTaskId.get(task.id);
                const status: 'available' | 'pending' | 'done' =
                  compStatus === 'approved' || compStatus === 'auto_approved'
                    ? 'done'
                    : compStatus === 'pending'
                      ? 'pending'
                      : 'available';

                return (
                  <TaskRow
                    key={task.id}
                    taskId={task.id}
                    childId={child.id}
                    familyId={child.family_id}
                    childName={child.name}
                    currentStreak={child.current_streak}
                    availableCount={availableCount}
                    title={task.title}
                    icon={task.icon}
                    coinValue={task.coin_value}
                    initialStatus={status}
                    requiresApproval={task.requires_approval}
                    requiresPhoto={task.requires_photo}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Подсказки для детей */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          <HintBanner
            id={`hint-child-potential-${child.id}`}
            emoji="💰"
            title="Сколько можно заработать?"
            body={weeklyPotential > 0
              ? `Если выполнять все задания без пропусков — ${weeklyPotential} pip в неделю и ${monthlyPotential} pip в месяц. Регулярность — это деньги!`
              : 'Выполняй задания каждый день — монетки будут копиться быстрее!'
            }
            variant="gold"
            show={weeklyPotential > 0 && child.current_streak < 3}
          />
          <HintBanner
            id={`hint-child-welcome-${child.id}`}
            emoji="👋"
            title="Добро пожаловать в pip!"
            body="Выполняй задания каждый день и копи PIP-монеты. Потом трать их в магазине на что-то классное!"
            variant="gold"
            show={child.balance === 0 && child.current_streak === 0}
          />
          <HintBanner
            id={`hint-child-deadline-${child.id}`}
            emoji="⏰"
            title="Успей до конца дня"
            body="Задания обновляются каждый день. Не откладывай — сделай сегодня, чтобы не потерять стрик!"
            variant="mint"
            show={availableCount > 0}
          />
          <HintBanner
            id={`hint-child-nocheat-${child.id}`}
            emoji="👀"
            title="Не пытайся жульничать!"
            body="Родители видят всё и могут вычесть монеты или поставить штраф. Делай честно — это выгоднее 😄"
            variant="coral"
            show={child.balance > 0}
          />
          <HintBanner
            id={`hint-child-shop-${child.id}`}
            emoji="🛍️"
            title="Загляни в магазин"
            body="У тебя уже есть монеты! Открой магазин и посмотри на что можно их потратить."
            variant="gold"
            cta={{ label: 'Открыть магазин', href: `/child/${child.id}/shop` }}
            show={child.balance >= 10}
          />
        </div>

        {/* Shop link */}
        <Link
          href={`/child/${child.id}/shop`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 16,
            padding: '14px 16px',
            background: 'var(--color-ink)',
            borderRadius: 'var(--radius-xl)',
            color: 'white',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🎁
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Магазин</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 1 }}>
              Купи награду за свои pip
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>

        {/* History link (Sprint 7) */}
        <Link
          href={`/child/${child.id}/history`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 10,
            padding: '14px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-xl)',
            color: 'var(--text-primary)',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'var(--color-gold-soft)',
              color: 'var(--color-gold-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🔥
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>История и стрик</div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 1 }}>
              Стрик {child.current_streak} · что заработал, что потратил
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>

        {/* Achievements link (Sprint 7) */}
        <Link
          href={`/child/${child.id}/achievements`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginTop: 10,
            padding: '14px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-xl)',
            color: 'var(--text-primary)',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--color-coral-soft), var(--color-gold-soft))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
            }}
          >
            🏆
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              Достижения
              {achievementsCount > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--color-gold-deep)', fontWeight: 700 }}>
                  {achievementsCount} из {totalAchievements}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 1 }}>
              {achievementsCount === 0
                ? 'Выполни первую задачу — получишь первый бейдж'
                : 'Бейджи за прогресс'}
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>

        <div
          style={{
            marginTop: 24,
            padding: '12px 16px',
            background: 'var(--color-mint-soft)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12.5,
            color: 'var(--color-mint-deep)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Ты в режиме {child.name}. PIN действует 1 час.
        </div>
      </div>

      <style>{`
        @keyframes pip-float-up {
          0% { opacity: 0; transform: translateY(0) scale(0.85); }
          15% { opacity: 1; transform: translateY(-6px) scale(1); }
          85% { opacity: 1; transform: translateY(-24px) scale(1); }
          100% { opacity: 0; transform: translateY(-36px) scale(0.95); }
        }
      `}</style>
    </main>
  );
}

function streakWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}
