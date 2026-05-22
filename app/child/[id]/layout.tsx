import { notFound } from 'next/navigation';
import { getChildContext } from '@/lib/getChildContext';
import { isTaskScheduledFor, nowInTimezone, todayInTimezone } from '@/lib/schedule';
import { ALL_ACHIEVEMENT_TYPES } from '@/lib/achievements';
import { ChildTopBar } from './ChildTopBar';
import { ChildTabBar } from './ChildTabBar';

type ChildProfile = {
  id: string;
  family_id: string;
  role: string;
  name: string;
  balance: number;
  avatar_color: string;
  avatar_emoji: string | null;
  avatar_url: string | null;
};

export default async function ChildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { db: supabase, familyId } = await getChildContext(id);

  const { data: child } = await supabase
    .from('profiles')
    .select('id, family_id, role, name, balance, avatar_color, avatar_emoji, avatar_url')
    .eq('id', id)
    .single<ChildProfile>();

  if (!child || child.family_id !== familyId || child.role !== 'child') notFound();

  // ── Today's available task count (for badge) ────────────────────────────
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
    .select('id, schedule_type, schedule_days, assigned_to')
    .eq('family_id', familyId)
    .is('archived_at', null)
    .contains('assigned_to', [id]);

  const todayTaskIds = (allTasks ?? [])
    .filter((t) => isTaskScheduledFor(t, dateInTz))
    .map((t) => t.id);

  let availableTaskCount = 0;
  if (todayTaskIds.length > 0) {
    const { data: completions = [] } = await supabase
      .from('task_completions')
      .select('task_id, status')
      .eq('profile_id', id)
      .eq('scheduled_for', today)
      .in('task_id', todayTaskIds);

    const doneOrPendingIds = new Set(
      (completions ?? [])
        .filter((c) => c.status !== 'rejected')
        .map((c) => c.task_id),
    );
    availableTaskCount = todayTaskIds.filter((tid) => !doneOrPendingIds.has(tid)).length;
  }

  // ── Achievements count (for profile badge) ──────────────────────────────
  const { count: achievementsCount = 0 } = await supabase
    .from('achievements')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', id);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ChildTopBar
        childId={id}
        balance={child.balance}
      />

      {/* Content area — padded only for fixed bottom tab bar */}
      <div style={{ flex: 1, paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
        {children}
      </div>

      <ChildTabBar
        childId={id}
        avatarColor={child.avatar_color}
        avatarEmoji={child.avatar_emoji}
        avatarUrl={child.avatar_url}
        childName={child.name}
        availableTaskCount={availableTaskCount}
        achievementsCount={achievementsCount ?? 0}
      />
    </div>
  );
}
