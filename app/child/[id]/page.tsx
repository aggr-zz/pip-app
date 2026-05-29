import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getChildContext } from '@/lib/getChildContext';
import { TaskRow } from './TaskRow';
import { BannerCarousel } from './BannerCarousel';
import { isTaskScheduledFor, nowInTimezone, todayInTimezone, type ScheduleType } from '@/lib/schedule';
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
  rejection_reason: string | null;
};

type ParentMessage = {
  id: string;
  type: string;
  amount: number;
  reason: string | null;
  created_at: string;
};

type GoalReward = {
  id: string;
  title: string;
  icon: string;
  coin_cost: number;
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
      .select('task_id, status, rejection_reason')
      .eq('profile_id', child.id)
      .eq('scheduled_for', today)
      .in('task_id', taskIds)
      .returns<TaskCompletion[]>();
    completions = rows ?? [];
  }

  // Текущая цель-копилка
  const { data: goalRow } = await supabase
    .from('reward_goals')
    .select('reward_id')
    .eq('child_id', child.id)
    .maybeSingle();

  let goalReward: GoalReward | null = null;
  if (goalRow?.reward_id) {
    const { data: rw } = await supabase
      .from('rewards')
      .select('id, title, icon, coin_cost')
      .eq('id', goalRow.reward_id)
      .maybeSingle<GoalReward>();
    goalReward = rw ?? null;
  }

  // Сообщения от родителя — manual_adjustment и bonus за последние 72 часа с причиной
  const since72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const { data: parentMessages = [] } = await supabase
    .from('transactions')
    .select('id, type, amount, reason, created_at')
    .eq('profile_id', child.id)
    .in('type', ['manual_adjustment', 'bonus'])
    .not('reason', 'is', null)
    .gte('created_at', since72h)
    .order('created_at', { ascending: false })
    .limit(5)
    .returns<ParentMessage[]>();

  const completionByTaskId = new Map(completions.map((c) => [c.task_id, c]));
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

  return (
    <main style={{ minHeight: '100%', padding: '20px 20px 24px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Banner carousel — full bleed */}
        <div style={{ margin: '-20px -20px 20px' }}>
          <BannerCarousel childId={child.id} />
        </div>

        {/* Greeting */}
        <div style={{ marginBottom: 16 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 22,
              letterSpacing: '-0.015em',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Привет, {child.name}! 👋
          </h1>
        </div>

        {/* Цель-копилка */}
        {goalReward && (
          <div style={{
            marginBottom: 16,
            padding: '14px 16px',
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--color-gold)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 4px 18px rgba(242,193,78,0.15)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-gold-deep)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              🎯 Моя мечта
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Иконка награды */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #FFE39A, #D4A12E)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26,
                boxShadow: '0 4px 12px rgba(212,161,46,0.3)',
              }}>
                {goalReward.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {goalReward.title}
                </div>
                {/* Прогресс-бар */}
                {(() => {
                  const pct = goalReward.coin_cost > 0
                    ? Math.min(100, Math.round((child.balance / goalReward.coin_cost) * 100))
                    : 100;
                  const need = Math.max(0, goalReward.coin_cost - child.balance);
                  const done = pct >= 100;
                  return (
                    <>
                      <div style={{ height: 8, background: 'rgba(0,0,0,0.08)', borderRadius: 100, overflow: 'hidden', marginBottom: 4 }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: done
                            ? 'linear-gradient(90deg, var(--color-mint), var(--color-mint-deep))'
                            : 'linear-gradient(90deg, var(--color-gold), var(--color-gold-deep))',
                          borderRadius: 100,
                          transition: 'width 0.5s ease',
                          minWidth: pct > 0 ? 8 : 0,
                        }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-soft)' }}>
                        <span style={{ color: done ? 'var(--color-mint-deep)' : 'var(--color-gold-deep)', fontWeight: 700 }}>
                          {done ? '🎉 Можно купить!' : `ещё ${need} PIP`}
                        </span>
                        <span>{child.balance} / {goalReward.coin_cost}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Parent messages — bonus / penalty notifications */}
        {(parentMessages ?? []).length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {(parentMessages ?? []).map((msg) => {
              const isBonus = msg.amount > 0;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    background: isBonus ? 'var(--color-mint-soft)' : 'var(--status-danger-soft)',
                    border: `1px solid ${isBonus ? 'var(--color-mint)' : 'var(--status-danger)'}`,
                    borderRadius: 'var(--radius-lg)',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-md)',
                      background: isBonus ? 'var(--color-mint)' : 'var(--color-coral)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      flexShrink: 0,
                    }}
                  >
                    {isBonus ? '⭐' : '⚠️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: isBonus ? 'var(--color-mint-deep)' : 'var(--status-danger)',
                        }}
                      >
                        {isBonus ? `+${msg.amount} PIP от родителя` : `${msg.amount} PIP от родителя`}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.45 }}>
                      «{msg.reason}»
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {timeAgoRu(msg.created_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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
                height: 7,
                background: 'rgba(0,0,0,0.08)',
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
                  minWidth: progress > 0 ? 8 : 0,
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
                const completion = completionByTaskId.get(task.id);
                const compStatus = completion?.status;
                const status: 'available' | 'pending' | 'done' =
                  compStatus === 'approved' || compStatus === 'auto_approved'
                    ? 'done'
                    : compStatus === 'pending'
                      ? 'pending'
                      : 'available';
                // undefined = not rejected; null = rejected with no reason; string = rejected with reason
                const rejectionReason: string | null | undefined =
                  compStatus === 'rejected' ? (completion?.rejection_reason ?? null) : undefined;

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
                    rejectionReason={rejectionReason}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* History link */}
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

function timeAgoRu(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 2) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  return `${days} дня назад`;
}

