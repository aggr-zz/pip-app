import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { TaskForm } from '../TaskForm';
import type { ScheduleType } from '@/lib/schedule';
import type { TaskIconName } from '@/components/ui/TaskIcon';

type Child = {
  id: string;
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
};

type Task = {
  id: string;
  family_id: string;
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

export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') redirect('/');

  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .single<Task>();

  if (!task || task.family_id !== me.family_id) {
    notFound();
  }

  const { data: children = [] } = await supabase
    .from('profiles')
    .select('id, name, avatar_color')
    .eq('family_id', me.family_id)
    .eq('role', 'child')
    .is('archived_at', null)
    .order('name')
    .returns<Child[]>();

  return (
    <main style={{ minHeight: '100vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <header style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/parent/tasks"
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
          <PipLogo size={26} />
        </header>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 30,
            letterSpacing: '-0.02em',
            margin: '0 0 8px',
            lineHeight: 1.05,
          }}
        >
          Редактирование
        </h1>
        <p
          style={{
            color: 'var(--text-soft)',
            fontSize: 14.5,
            margin: '0 0 28px',
            lineHeight: 1.5,
          }}
        >
          Изменения применятся к будущим выполнениям. Уже выполненные — не тронутся.
        </p>

        <TaskForm
          mode="edit"
          taskId={task.id}
          children={children ?? []}
          defaults={{
            title: task.title,
            description: task.description,
            icon: task.icon,
            coin_value: task.coin_value,
            schedule_type: task.schedule_type,
            schedule_days: task.schedule_days,
            requires_approval: task.requires_approval,
            requires_photo: task.requires_photo,
            assigned_to: task.assigned_to,
          }}
        />
      </div>
    </main>
  );
}
