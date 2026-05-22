import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { SignOutButton } from './SignOutButton';
import { RealtimeRefresh } from '@/components/realtime/RealtimeRefresh';
import { ParentBannerCarousel } from './ParentBannerCarousel';
import { ChildrenPanel, type ChildData } from './ChildrenPanel';
import { isTaskScheduledFor, todayInTimezone, nowInTimezone } from '@/lib/schedule';

type Profile = {
  id: string;
  family_id: string;
  role: 'parent' | 'child';
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  avatar_emoji: string | null;
  avatar_url: string | null;
  balance: number;
  current_streak: number;
};

type Task = {
  id: string;
  title: string;
  icon: string;
  coin_value: number;
  schedule_type: string;
  schedule_days: number[] | null;
  assigned_to: string[];
  requires_photo: boolean;
};

type Completion = {
  id: string;
  task_id: string;
  profile_id: string;
  status: string;
  photo_path: string | null;
  completed_at: string;
};

export default async function ParentDashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single<Profile>();

  if (!me) {
    return (
      <main style={{ padding: 32 }}>
        <h1>Профиль не найден</h1>
        <SignOutButton />
      </main>
    );
  }

  if (me.role === 'child') redirect('/child');

  // ── Family ──────────────────────────────────────────────────────────────
  const { data: family } = await supabase
    .from('families')
    .select('timezone, name')
    .eq('id', me.family_id)
    .single();

  const tz = family?.timezone || 'Europe/Moscow';
  const today = todayInTimezone(tz);
  const dateInTz = nowInTimezone(tz);

  // ── Children ────────────────────────────────────────────────────────────
  const { data: children = [] } = await supabase
    .from('profiles')
    .select('id, name, avatar_color, avatar_emoji, avatar_url, balance, current_streak, family_id, role')
    .eq('family_id', me.family_id)
    .eq('role', 'child')
    .is('archived_at', null)
    .order('name')
    .returns<Profile[]>();

  const childIds = (children ?? []).map((c) => c.id);

  if (childIds.length === 0) {
    return (
      <main style={{ minHeight: '100%' }}>
        <TopBar name={me.name} />
        <div style={{ padding: '32px 20px' }}>
          <ChildrenPanel children={[]} />
        </div>
      </main>
    );
  }

  // ── All active tasks for this family ────────────────────────────────────
  const { data: allTasks = [] } = await supabase
    .from('tasks')
    .select('id, title, icon, coin_value, schedule_type, schedule_days, assigned_to, requires_photo')
    .eq('family_id', me.family_id)
    .is('archived_at', null)
    .returns<Task[]>();

  // ── Today's completions ─────────────────────────────────────────────────
  const { data: todayCompletions = [] } = await supabase
    .from('task_completions')
    .select('id, task_id, profile_id, status, photo_path, completed_at')
    .in('profile_id', childIds)
    .eq('scheduled_for', today)
    .returns<Completion[]>();

  // ── Build per-child data ─────────────────────────────────────────────────
  const childrenWithTasks: ChildData[] = (children ?? []).map((child) => {
    const childTasks = (allTasks ?? []).filter(
      (t) => t.assigned_to.includes(child.id) && isTaskScheduledFor(t as any, dateInTz)
    );

    const childCompletions = (todayCompletions ?? []).filter(
      (c) => c.profile_id === child.id
    );
    const completionsByTaskId = new Map(childCompletions.map((c) => [c.task_id, c]));

    // Pending approvals
    const pendingApprovals = childCompletions
      .filter((c) => c.status === 'pending')
      .map((c) => {
        const task = (allTasks ?? []).find((t) => t.id === c.task_id);
        return {
          completionId: c.id,
          taskTitle: task?.title ?? 'Задание',
          taskIcon: task?.icon ?? '✅',
          coinValue: task?.coin_value ?? 0,
          hasPhoto: Boolean(c.photo_path),
          completedAt: c.completed_at,
        };
      });

    // Today's tasks with status
    const todayTasks = childTasks.map((task) => {
      const completion = completionsByTaskId.get(task.id);
      let status: 'done' | 'pending' | 'available' = 'available';
      if (completion) {
        if (completion.status === 'approved' || completion.status === 'auto_approved') {
          status = 'done';
        } else if (completion.status === 'pending') {
          status = 'pending';
        }
        // rejected → available again
      }
      return {
        taskId: task.id,
        title: task.title,
        icon: task.icon,
        coinValue: task.coin_value,
        status,
      };
    });

    return {
      id: child.id,
      name: child.name,
      avatar_color: child.avatar_color,
      avatar_emoji: child.avatar_emoji,
      avatar_url: child.avatar_url,
      balance: child.balance,
      current_streak: child.current_streak,
      pendingApprovals,
      todayTasks,
    };
  });

  // 1 child → auto-expand; 2+ children → all collapsed
  const defaultExpandedId = childrenWithTasks.length === 1 ? childrenWithTasks[0].id : null;

  const totalPending = childrenWithTasks.reduce((s, c) => s + c.pendingApprovals.length, 0);

  return (
    <main style={{ minHeight: '100%' }}>
      <RealtimeRefresh tables={['task_completions', 'reward_orders']} />

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <TopBar name={me.name} />

      {/* ── Banner carousel ─────────────────────────────────────────── */}
      <ParentBannerCarousel />

      {/* ── Content ─────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 32px', maxWidth: 600, margin: '0 auto' }}>

        {/* Section header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 20,
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            {totalPending > 0 ? (
              <>
                <span style={{ color: 'var(--color-coral)' }}>⚡ {totalPending}</span>
                {' '}на проверку
              </>
            ) : 'Дети'}
          </h2>
          <a
            href="/parent/children/new"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-coral)',
              textDecoration: 'none',
              padding: '5px 10px',
              background: 'var(--color-coral-soft)',
              borderRadius: 100,
            }}
          >
            + Добавить
          </a>
        </div>

        <ChildrenPanel
          children={childrenWithTasks}
          defaultExpandedId={defaultExpandedId}
        />
      </div>
    </main>
  );
}

// ── Inline top bar (no layout-level top bar) ──────────────────────────────────
function TopBar({ name }: { name: string }) {
  return (
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-soft)' }}>{name}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
