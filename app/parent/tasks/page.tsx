import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinPill } from '@/components/ui/Coin';
import { TaskIcon, type TaskIconName } from '@/components/ui/TaskIcon';
import { describeSchedule, type ScheduleType } from '@/lib/schedule';
import { HintBanner } from '@/components/ui/HintBanner';

type Profile = {
  id: string;
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
};

type Task = {
  id: string;
  title: string;
  icon: TaskIconName;
  coin_value: number;
  schedule_type: ScheduleType;
  schedule_days: number[] | null;
  assigned_to: string[];
  archived_at: string | null;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const filter = params.filter || 'all';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') redirect('/');

  // Все дети семьи (для фильтра)
  const { data: children = [] } = await supabase
    .from('profiles')
    .select('id, name, avatar_color')
    .eq('family_id', me.family_id)
    .eq('role', 'child')
    .is('archived_at', null)
    .order('name')
    .returns<Profile[]>();

  // Задачи
  let tasksQuery = supabase
    .from('tasks')
    .select('id, title, icon, coin_value, schedule_type, schedule_days, assigned_to, archived_at')
    .eq('family_id', me.family_id);

  if (filter === 'archived') {
    tasksQuery = tasksQuery.not('archived_at', 'is', null);
  } else {
    tasksQuery = tasksQuery.is('archived_at', null);
  }

  const { data: allTasks = [] } = await tasksQuery
    .order('created_at', { ascending: false })
    .returns<Task[]>();

  // Фильтруем по ребёнку (если выбран)
  const filteredTasks =
    filter === 'all' || filter === 'archived'
      ? allTasks
      : (allTasks ?? []).filter((t) => t.assigned_to.includes(filter));

  // Группируем по schedule_type
  const groups = {
    daily: filteredTasks?.filter((t) => t.schedule_type === 'daily') ?? [],
    weekdays: filteredTasks?.filter((t) => t.schedule_type === 'weekdays') ?? [],
    custom: filteredTasks?.filter((t) => t.schedule_type === 'custom') ?? [],
    once: filteredTasks?.filter((t) => t.schedule_type === 'once') ?? [],
  };

  const childMap = new Map((children ?? []).map((c) => [c.id, c]));

  return (
    <main style={{ minHeight: '100vh', paddingBottom: 40 }}>
      <header style={headerStyle}>
        <div style={headerContainerStyle}>
          <Link href="/parent" aria-label="Назад" style={backBtnStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <PipLogo size={26} />
          <Link href="/parent/tasks/new" style={addBtnStyle} aria-label="Добавить задачу">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        </div>
      </header>

      <div style={containerStyle}>
        <h1 style={titleStyle}>Задачи</h1>
        <p style={subtitleStyle}>
          {filter === 'archived' ? 'В архиве' : `${filteredTasks?.length ?? 0} активных`}
        </p>
        {filter !== 'archived' && (
          <div style={{ marginTop: 12 }}>
            <HintBanner
              id="hint-tasks-approval"
              emoji="✅"
              title="Как работает подтверждение?"
              body='Задания с флагом "требует подтверждения" — родитель одобряет, и только потом ребёнок получает монеты. Без флага — монеты зачисляются сразу.'
              variant="neutral"
              show={(allTasks?.length ?? 0) > 0}
            />
          </div>
        )}

        {/* Фильтры */}
        <div style={filtersStyle}>
          <FilterChip href="/parent/tasks" active={filter === 'all'}>
            Все
          </FilterChip>
          {(children ?? []).map((c) => (
            <FilterChip
              key={c.id}
              href={`/parent/tasks?filter=${c.id}`}
              active={filter === c.id}
            >
              {c.name}
            </FilterChip>
          ))}
          <FilterChip href="/parent/tasks?filter=archived" active={filter === 'archived'}>
            Архив
          </FilterChip>
        </div>

        {filteredTasks?.length === 0 ? (
          <EmptyState filter={filter} childrenCount={children?.length ?? 0} />
        ) : (
          <>
            {groups.daily.length > 0 && (
              <Group title="Каждый день" tasks={groups.daily} childMap={childMap} />
            )}
            {groups.weekdays.length > 0 && (
              <Group title="Пн–Пт" tasks={groups.weekdays} childMap={childMap} />
            )}
            {groups.custom.length > 0 && (
              <Group title="По дням недели" tasks={groups.custom} childMap={childMap} />
            )}
            {groups.once.length > 0 && (
              <Group title="Разовые" tasks={groups.once} childMap={childMap} />
            )}
          </>
        )}
      </div>
    </main>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        padding: '7px 14px',
        borderRadius: 'var(--radius-pill)',
        background: active ? 'var(--color-ink)' : 'var(--bg-surface)',
        color: active ? 'white' : 'var(--text-soft)',
        border: `1px solid ${active ? 'var(--color-ink)' : 'var(--border-default)'}`,
        fontSize: 12.5,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Link>
  );
}

function Group({
  title,
  tasks,
  childMap,
}: {
  title: string;
  tasks: Task[];
  childMap: Map<string, Profile>;
}) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={groupTitleStyle}>
        {title} <span style={{ color: 'var(--text-mute)' }}>· {tasks.length}</span>
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} childMap={childMap} />
        ))}
      </div>
    </section>
  );
}

function TaskRow({ task, childMap }: { task: Task; childMap: Map<string, Profile> }) {
  const assignedNames = task.assigned_to
    .map((id) => childMap.get(id)?.name)
    .filter(Boolean)
    .join(', ');

  return (
    <Link
      href={`/parent/tasks/${task.id}`}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity: task.archived_at ? 0.6 : 1,
      }}
    >
      <TaskIcon name={task.icon as TaskIconName} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: 'var(--text-primary)',
            marginBottom: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {task.title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: 'var(--text-soft)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {assignedNames || '—'} · {describeSchedule(task)}
        </div>
      </div>
      <CoinPill amount={task.coin_value} />
    </Link>
  );
}

function EmptyState({ filter, childrenCount }: { filter: string; childrenCount: number }) {
  if (childrenCount === 0) {
    return (
      <div style={emptyStyle}>
        <div style={emptyIconStyle}>👋</div>
        <h2 style={emptyTitleStyle}>Сначала добавь ребёнка</h2>
        <p style={emptyTextStyle}>
          Задачи назначаются конкретным детям. Создай профиль ребёнка, потом возвращайся сюда.
        </p>
        <Link
          href="/parent/children/new"
          style={{
            display: 'inline-flex',
            background: 'var(--color-ink)',
            color: 'white',
            padding: '12px 22px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          + Добавить ребёнка
        </Link>
      </div>
    );
  }

  return (
    <div style={emptyStyle}>
      <div style={emptyIconStyle}>📝</div>
      <h2 style={emptyTitleStyle}>
        {filter === 'archived' ? 'Архив пуст' : 'Пока нет задач'}
      </h2>
      <p style={emptyTextStyle}>
        {filter === 'archived'
          ? 'Архивированные задачи будут здесь'
          : 'Создай первую задачу: что-то простое, что ребёнок делает каждый день'}
      </p>
      {filter !== 'archived' && (
        <Link
          href="/parent/tasks/new"
          style={{
            display: 'inline-flex',
            background: 'var(--color-ink)',
            color: 'white',
            padding: '12px 22px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          + Новая задача
        </Link>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const headerStyle: React.CSSProperties = {
  background: 'var(--bg-surface)',
  borderBottom: '1px solid var(--border-soft)',
  position: 'sticky',
  top: 0,
  zIndex: 10,
};
const headerContainerStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '14px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};
const backBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 100,
  background: 'var(--bg-surface)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
  flexShrink: 0,
};
const addBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: 100,
  background: 'var(--color-ink)',
  marginLeft: 'auto',
};
const containerStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '32px 20px',
};
const titleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 30,
  letterSpacing: '-0.02em',
  margin: '0 0 4px',
};
const subtitleStyle: React.CSSProperties = {
  color: 'var(--text-soft)',
  fontSize: 13.5,
  margin: '0 0 24px',
};
const filtersStyle: React.CSSProperties = {
  display: 'flex',
  gap: 6,
  flexWrap: 'wrap',
  marginBottom: 28,
};
const groupTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 13,
  color: 'var(--text-soft)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 10px',
};
const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '56px 24px',
  background: 'var(--bg-surface)',
  borderRadius: 'var(--radius-2xl)',
  border: '1px solid var(--border-soft)',
};
const emptyIconStyle: React.CSSProperties = { fontSize: 48, marginBottom: 12 };
const emptyTitleStyle: React.CSSProperties = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 22,
  letterSpacing: '-0.015em',
  margin: '0 0 10px',
};
const emptyTextStyle: React.CSSProperties = {
  color: 'var(--text-soft)',
  fontSize: 14,
  lineHeight: 1.5,
  maxWidth: 380,
  margin: '0 auto 24px',
};
