import { notFound } from 'next/navigation';
import { getChildContext } from '@/lib/getChildContext';
import Link from 'next/link';


import { PipLogo } from '@/components/ui/PipLogo';
import { TaskIcon, type TaskIconName } from '@/components/ui/TaskIcon';
import { isTaskScheduledFor, nowInTimezone, todayInTimezone, type ScheduleType } from '@/lib/schedule';
import { TaskDetailActions } from './TaskDetailActions';

type Task = {
  id: string;
  title: string;
  description: string | null;
  icon: TaskIconName;
  coin_value: number;
  schedule_type: ScheduleType;
  schedule_days: number[] | null;
  requires_approval: boolean;
  requires_photo: boolean;
  assigned_to: string[];
};

type Profile = {
  id: string;
  family_id: string;
  role: string;
  name: string;
  current_streak: number;
  balance: number;
};

type TaskCompletion = {
  task_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_approved';
};

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string; taskId: string }>;
}) {
  const { id: childId, taskId } = await params;
  const { db: supabase, familyId } = await getChildContext(childId);

  const { data: child } = await supabase
    .from('profiles')
    .select('id, family_id, role, name, current_streak, balance')
    .eq('id', childId)
    .single<Profile>();
  if (!child || child.family_id !== familyId || child.role !== 'child') notFound();

  const { data: task } = await supabase
    .from('tasks')
    .select('id, title, description, icon, coin_value, schedule_type, schedule_days, requires_approval, requires_photo, assigned_to')
    .eq('id', taskId)
    .eq('family_id', familyId)
    .is('archived_at', null)
    .single<Task>();

  if (!task) notFound();
  if (!task.assigned_to.includes(childId)) notFound();

  const { data: family } = await supabase
    .from('families').select('timezone').eq('id', familyId).single();
  const tz = family?.timezone || 'Europe/Moscow';
  const today = todayInTimezone(tz);
  const dateInTz = nowInTimezone(tz);

  // Расписание на сегодня
  const isScheduledToday = isTaskScheduledFor(task, dateInTz);

  // Статус выполнения сегодня
  let completion: TaskCompletion | null = null;
  if (isScheduledToday) {
    // maybeSingle: для «доступной» задачи строки нет — .single() давал бы
    // ложную 406/PGRST116-ошибку в логах на каждом открытии карточки.
    const { data: row } = await supabase
      .from('task_completions')
      .select('task_id, status')
      .eq('profile_id', childId)
      .eq('task_id', taskId)
      .eq('scheduled_for', today)
      .maybeSingle<TaskCompletion>();
    completion = row;
  }

  const status: 'available' | 'pending' | 'done' | 'not_today' =
    !isScheduledToday
      ? 'not_today'
      : completion?.status === 'approved' || completion?.status === 'auto_approved'
        ? 'done'
        : completion?.status === 'pending'
          ? 'pending'
          : 'available';

  return (
    <main style={{ minHeight: '100%', background: 'var(--bg-page)' }}>
      <div style={{ maxWidth: 480, margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <header style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '20px 20px 0',
        }}>
          <Link
            href={`/child/${childId}`}
            aria-label="Назад"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 38, height: 38, borderRadius: 100,
              background: 'var(--bg-surface)', border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <PipLogo size={26} href={`/child/${childId}`} />
          <div style={{ width: 38 }} />
        </header>

        {/* ── Task hero ─────────────────────────────────────── */}
        <div style={{ padding: '32px 24px 0', textAlign: 'center' }}>
          {/* Большая иконка */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 96, height: 96, borderRadius: 28,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            marginBottom: 20,
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}>
            <TaskIcon name={task.icon} size={64} colored={false} />
          </div>

          {/* Название */}
          <h1 style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 28, letterSpacing: '-0.02em',
            margin: '0 0 10px', lineHeight: 1.1,
          }}>
            {task.title}
          </h1>

          {/* Описание */}
          {task.description && (
            <p style={{
              fontSize: 15, color: 'var(--text-soft)',
              lineHeight: 1.55, margin: '0 0 16px',
            }}>
              {task.description}
            </p>
          )}

          {/* Монеты + флаги */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Награда */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 'var(--radius-pill)',
              background: 'var(--color-gold-soft)',
              color: 'var(--color-gold-deep)',
              fontWeight: 700, fontSize: 16,
            }}>
              <span style={{ fontSize: 18 }}>🪙</span>
              {task.coin_value} PIP
            </div>

            {/* Требует подтверждения */}
            {task.requires_approval && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', borderRadius: 'var(--radius-pill)',
                background: 'var(--color-coral-soft)',
                color: 'var(--color-coral-deep)',
                fontWeight: 600, fontSize: 12.5,
              }}>
                <span>✅</span> Нужно подтверждение
              </div>
            )}

            {/* Требует фото */}
            {task.requires_photo && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '8px 14px', borderRadius: 'var(--radius-pill)',
                background: 'var(--color-mint-soft)',
                color: 'var(--color-mint-deep)',
                fontWeight: 600, fontSize: 12.5,
              }}>
                <span>📷</span> С фото
              </div>
            )}
          </div>
        </div>

        {/* ── Разделитель ────────────────────────────────────── */}
        <div style={{
          margin: '28px 24px',
          height: 1,
          background: 'var(--border-soft)',
        }} />

        {/* ── Статус / действия ─────────────────────────────── */}
        <div style={{ padding: '0 24px', flex: 1 }}>
          {status === 'not_today' && (
            <div style={{
              padding: '20px', borderRadius: 'var(--radius-xl)',
              background: 'var(--bg-surface)', border: '1px solid var(--border-soft)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
              <p style={{ margin: 0, color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.5 }}>
                Это задание не запланировано на сегодня
              </p>
            </div>
          )}

          {status === 'done' && (
            <div style={{
              padding: '24px 20px', borderRadius: 'var(--radius-xl)',
              background: 'var(--color-mint-soft)', border: '1px solid var(--color-mint)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>✅</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 20, color: 'var(--color-mint-deep)', marginBottom: 4,
              }}>
                Выполнено!
              </div>
              <p style={{ margin: 0, color: 'var(--color-mint-deep)', fontSize: 13, opacity: 0.8 }}>
                Молодец, так держать 🎉
              </p>
            </div>
          )}

          {status === 'pending' && (
            <div style={{
              padding: '24px 20px', borderRadius: 'var(--radius-xl)',
              background: 'var(--color-gold-soft)', border: '1px solid var(--color-gold)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 48, marginBottom: 10 }}>⏳</div>
              <div style={{
                fontFamily: 'var(--font-display)', fontWeight: 700,
                fontSize: 20, color: 'var(--color-gold-deep)', marginBottom: 4,
              }}>
                Ждём подтверждения
              </div>
              <p style={{ margin: 0, color: 'var(--color-gold-deep)', fontSize: 13, opacity: 0.85 }}>
                Родитель проверит и начислит монеты
              </p>
            </div>
          )}

          {status === 'available' && (
            <TaskDetailActions
              taskId={task.id}
              childId={childId}
              familyId={child.family_id}
              childName={child.name}
              taskTitle={task.title}
              coinValue={task.coin_value}
              requiresApproval={task.requires_approval}
              requiresPhoto={task.requires_photo}
              currentStreak={child.current_streak}
            />
          )}
        </div>

        <div style={{ height: 40 }} />
      </div>
    </main>
  );
}
