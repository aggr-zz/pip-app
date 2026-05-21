import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinPill } from '@/components/ui/Coin';
import { TaskIcon, type TaskIconName } from '@/components/ui/TaskIcon';
import { autoApproveSweep } from './actions';
import { ApproveAllButton } from './ApproveAllButton';
import { RealtimeRefresh } from '@/components/realtime/RealtimeRefresh';

type PendingCompletion = {
  id: string;
  task_id: string;
  profile_id: string;
  completed_at: string;
  scheduled_for: string;
  photo_path: string | null;
  task: {
    title: string;
    icon: TaskIconName;
    coin_value: number;
    requires_photo: boolean;
  } | null;
  profile: {
    name: string;
    avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  } | null;
};

export default async function ApprovalsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') redirect('/');

  // 1. Сначала автоаппрув старых pending
  const autoApprovedCount = await autoApproveSweep();

  // 2. Получаем семейные настройки для подписи про автоаппрув
  const { data: family } = await supabase
    .from('families')
    .select('auto_approve_hours')
    .eq('id', me.family_id)
    .single();

  // 3. Список pending (после sweep)
  // Получаем профили детей и задачи отдельными запросами для надёжности типов
  const { data: childProfiles = [] } = await supabase
    .from('profiles')
    .select('id, name, avatar_color')
    .eq('family_id', me.family_id)
    .eq('role', 'child');

  const childIds = (childProfiles ?? []).map((c) => c.id);
  const profileById = new Map(
    (childProfiles ?? []).map((p) => [p.id, p])
  );

  let pending: PendingCompletion[] = [];

  if (childIds.length > 0) {
    const { data: completions = [] } = await supabase
      .from('task_completions')
      .select('id, task_id, profile_id, completed_at, scheduled_for, photo_path')
      .in('profile_id', childIds)
      .eq('status', 'pending')
      .order('completed_at', { ascending: true });

    const taskIds = Array.from(new Set((completions ?? []).map((c) => c.task_id)));
    const { data: tasks = [] } = await supabase
      .from('tasks')
      .select('id, title, icon, coin_value, requires_photo')
      .in('id', taskIds);

    const taskById = new Map((tasks ?? []).map((t) => [t.id, t]));

    pending = (completions ?? []).map((c) => ({
      id: c.id,
      task_id: c.task_id,
      profile_id: c.profile_id,
      completed_at: c.completed_at,
      scheduled_for: c.scheduled_for,
      photo_path: c.photo_path,
      task: taskById.get(c.task_id) ?? null,
      profile: profileById.get(c.profile_id) ?? null,
    }));
  }

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px 64px' }}>
      <RealtimeRefresh tables={['task_completions']} />
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Header */}
        <header style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
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
          <PipLogo size={28} />
        </header>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 32,
              letterSpacing: '-0.02em',
              margin: 0,
              lineHeight: 1.05,
            }}
          >
            Подтверждения
          </h1>
          {pending.length > 1 && (
            <ApproveAllButton completionIds={pending.map((c) => c.id)} />
          )}
        </div>
        <p style={{ color: 'var(--text-soft)', fontSize: 14.5, margin: '0 0 24px', lineHeight: 1.5 }}>
          Задачи, которые дети отметили как сделанные. Подтверди, чтобы зачислить монеты, или отклони с комментарием.
        </p>

        {autoApprovedCount > 0 && (
          <div
            style={{
              background: 'var(--color-mint-soft)',
              border: '1px solid var(--color-mint)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: 13,
              color: 'var(--color-mint-deep)',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            Автоматически подтверждено {autoApprovedCount} задач(и), на которые не отреагировали за {family?.auto_approve_hours ?? 24}ч
          </div>
        )}

        {pending.length === 0 ? (
          <div
            style={{
              padding: '56px 24px',
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-default)',
              borderRadius: 'var(--radius-2xl)',
              textAlign: 'center',
              color: 'var(--text-soft)',
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 16 }}>✨</div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: 22,
                margin: '0 0 8px',
                color: 'var(--text-primary)',
              }}
            >
              Всё подтверждено
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>
              Когда ребёнок отметит задачу как сделанную, она появится тут.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.map((c) => (
              <Link
                key={c.id}
                href={`/parent/approvals/${c.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '14px 16px',
                  transition: 'border-color 0.15s, transform 0.1s',
                }}
              >
                {c.task && <TaskIcon name={c.task.icon} size={42} />}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      lineHeight: 1.3,
                      marginBottom: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.task?.title ?? '—'}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    {c.profile && (
                      <>
                        <Avatar
                          name={c.profile.name}
                          color={c.profile.avatar_color}
                          size="xs"
                        />
                        <span>{c.profile.name}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{timeAgo(c.completed_at)}</span>
                    {c.photo_path && (
                      <>
                        <span>·</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="5" width="18" height="14" rx="2" />
                            <circle cx="12" cy="12" r="3" />
                            <path d="M7 5l2-2h6l2 2" />
                          </svg>
                          фото
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {c.task && <CoinPill amount={c.task.coin_value} />}

                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ color: 'var(--text-muted)', flexShrink: 0 }}
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'только что';
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'час' : hours < 5 ? 'часа' : 'часов'} назад`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'день' : days < 5 ? 'дня' : 'дней'} назад`;
}
