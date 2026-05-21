'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTask, updateTask, archiveTask, type TaskInput } from './actions';
import { TASK_ICONS, TaskIcon, type TaskIconName, ICON_LABELS } from '@/components/ui/TaskIcon';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import type { ScheduleType } from '@/lib/schedule';

interface Child {
  id: string;
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
}

interface ExistingTask {
  id?: string;
  coin_value: number;
  schedule_type: string;
  schedule_days: number[] | null;
}

interface Props {
  mode: 'create' | 'edit';
  taskId?: string;
  children: Child[];
  defaults?: Partial<TaskInput>;
  existingTasks?: ExistingTask[];
}

// Сколько раз в неделю выполняется задание
function timesPerWeek(t: { schedule_type: string; schedule_days: number[] | null }): number {
  if (t.schedule_type === 'daily') return 7;
  if (t.schedule_type === 'weekdays') return 5;
  if (t.schedule_type === 'custom') return (t.schedule_days ?? []).length;
  return 0; // once — разово, не учитываем в регулярном доходе
}

function earnPerWeek(coinValue: number, scheduleType: string, scheduleDays: number[]): number {
  return coinValue * timesPerWeek({ schedule_type: scheduleType, schedule_days: scheduleDays });
}

function earnPerMonth(coinValue: number, scheduleType: string, scheduleDays: number[]): number {
  const perWeek = earnPerWeek(coinValue, scheduleType, scheduleDays);
  return Math.round(perWeek * 4.3);
}

const COIN_PRESETS = [5, 10, 20, 30, 50, 100];
const DAYS = [
  { value: 0, label: 'Пн' },
  { value: 1, label: 'Вт' },
  { value: 2, label: 'Ср' },
  { value: 3, label: 'Чт' },
  { value: 4, label: 'Пт' },
  { value: 5, label: 'Сб' },
  { value: 6, label: 'Вс' },
];

export function TaskForm({ mode, taskId, children, defaults, existingTasks = [] }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState(defaults?.title ?? '');
  const [icon, setIcon] = useState<TaskIconName>(defaults?.icon ?? 'school');
  const [coinValue, setCoinValue] = useState<number>(defaults?.coin_value ?? 10);
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    defaults?.schedule_type ?? 'daily'
  );
  const [scheduleDays, setScheduleDays] = useState<number[]>(defaults?.schedule_days ?? []);
  const [assignedTo, setAssignedTo] = useState<string[]>(
    defaults?.assigned_to ?? children.map((c) => c.id)
  );
  const [requiresApproval, setRequiresApproval] = useState<boolean>(
    defaults?.requires_approval ?? true
  );

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showArchive, setShowArchive] = useState(false);

  function toggleAssigned(childId: string) {
    setAssignedTo((cur) =>
      cur.includes(childId) ? cur.filter((id) => id !== childId) : [...cur, childId]
    );
  }

  function toggleDay(day: number) {
    setScheduleDays((cur) =>
      cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: TaskInput = {
      title: title.trim(),
      icon,
      coin_value: coinValue,
      schedule_type: scheduleType,
      schedule_days: scheduleType === 'custom' ? scheduleDays : null,
      requires_approval: requiresApproval,
      requires_photo: false, // Sprint 3
      assigned_to: assignedTo,
    };

    startTransition(async () => {
      const result =
        mode === 'create' ? await createTask(payload) : await updateTask(taskId!, payload);

      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/parent/tasks');
      router.refresh();
    });
  }

  function handleArchive() {
    if (!taskId) return;
    startTransition(async () => {
      const result = await archiveTask(taskId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/parent/tasks');
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Название */}
      <Field>
        <Label>Название</Label>
        <Input
          value={title}
          onChange={setTitle}
          placeholder="Например, Помыть посуду"
          disabled={isPending}
          maxLength={80}
        />
      </Field>

      {/* Иконка */}
      <Field>
        <Label>Иконка</Label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gap: 8,
          }}
        >
          {TASK_ICONS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIcon(i)}
              aria-pressed={i === icon}
              aria-label={ICON_LABELS[i]}
              disabled={isPending}
              title={ICON_LABELS[i]}
              style={{
                background: i === icon ? 'var(--bg-surface-2)' : 'transparent',
                border: 'none',
                padding: '6px 0 4px',
                cursor: 'pointer',
                borderRadius: 'var(--radius-md)',
                boxShadow:
                  i === icon
                    ? '0 0 0 2px var(--color-coral)'
                    : '0 0 0 1px var(--border-soft)',
                transition: 'box-shadow 0.15s, background 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <TaskIcon name={i} size={36} />
              <span style={{
                fontSize: 9.5,
                color: i === icon ? 'var(--color-coral-deep)' : 'var(--text-muted)',
                fontWeight: i === icon ? 600 : 400,
                lineHeight: 1,
                letterSpacing: '-0.01em',
              }}>
                {ICON_LABELS[i]}
              </span>
            </button>
          ))}
        </div>
      </Field>

      {/* Стоимость */}
      <Field>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Label>Стоимость</Label>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 18,
              color: 'var(--color-gold-deep)',
            }}
          >
            {coinValue} PIP
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={500}
          step={1}
          value={coinValue}
          onChange={(e) => setCoinValue(parseInt(e.target.value, 10))}
          disabled={isPending}
          style={{ width: '100%', accentColor: 'var(--color-coral)' }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {COIN_PRESETS.map((preset) => (
            <Chip
              key={preset}
              active={coinValue === preset}
              onClick={() => setCoinValue(preset)}
              disabled={isPending}
            >
              {preset}
            </Chip>
          ))}
        </div>

        {/* Подсказка — сколько можно заработать */}
        {scheduleType !== 'once' && (() => {
          const thisWeek = earnPerWeek(coinValue, scheduleType, scheduleDays);
          const thisMonth = earnPerMonth(coinValue, scheduleType, scheduleDays);
          const otherTasks = existingTasks.filter((t) => t.id !== taskId && t.schedule_type !== 'once');
          const otherWeek = otherTasks.reduce((sum, t) => sum + t.coin_value * timesPerWeek(t), 0);
          const totalWeek = otherWeek + thisWeek;
          const totalMonth = Math.round(totalWeek * 4.3);
          return (
            <div style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'var(--color-gold-soft)',
              border: '1px solid var(--color-gold)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13,
              color: 'var(--color-ink-2)',
              lineHeight: 1.5,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>Это задание:</span>
                <span style={{ fontWeight: 600 }}>
                  {thisWeek} PIP/нед · {thisMonth} PIP/мес
                </span>
              </div>
              {totalWeek !== thisWeek && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4, paddingTop: 6, borderTop: '1px solid var(--color-gold)' }}>
                  <span>Всего (все задания):</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-gold-deep)' }}>
                    {totalWeek} PIP/нед · {totalMonth} PIP/мес
                  </span>
                </div>
              )}
            </div>
          );
        })()}
      </Field>

      {/* Расписание */}
      <Field>
        <Label>Когда</Label>
        <SegmentedControl
          options={[
            { value: 'daily', label: 'Каждый день' },
            { value: 'weekdays', label: 'Пн–Пт' },
            { value: 'custom', label: 'По дням' },
            { value: 'once', label: 'Разово' },
          ]}
          value={scheduleType}
          onChange={(v) => setScheduleType(v as ScheduleType)}
          disabled={isPending}
        />

        {scheduleType === 'custom' && (
          <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
            {DAYS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                disabled={isPending}
                aria-pressed={scheduleDays.includes(d.value)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: scheduleDays.includes(d.value)
                    ? 'var(--color-ink)'
                    : 'var(--bg-surface)',
                  color: scheduleDays.includes(d.value) ? 'white' : 'var(--text-soft)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        )}
      </Field>

      {/* Кому */}
      <Field>
        <Label>Кому</Label>
        {children.length === 0 ? (
          <Hint>Сначала добавь хотя бы одного ребёнка</Hint>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {children.map((c) => {
              const active = assignedTo.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleAssigned(c.id)}
                  aria-pressed={active}
                  disabled={isPending}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: active ? 'var(--color-ink)' : 'var(--bg-surface)',
                    border: `1px solid ${active ? 'var(--color-ink)' : 'var(--border-default)'}`,
                    color: active ? 'white' : 'var(--text-soft)',
                    padding: '4px 14px 4px 4px',
                    borderRadius: 'var(--radius-pill)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  <Avatar name={c.name} color={c.avatar_color} size="sm" />
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      {/* Подтверждение */}
      <Field>
        <ToggleRow
          label="Подтверждать вручную"
          description="Ребёнок отмечает «готово», а ты подтверждаешь и начисляешь монеты"
          value={requiresApproval}
          onChange={setRequiresApproval}
          disabled={isPending}
        />
      </Field>

      {error && (
        <div role="alert" style={errorStyle}>
          {error}
        </div>
      )}

      <Button type="submit" variant="ink" size="lg" fullWidth disabled={isPending}>
        {isPending ? 'Сохраняем…' : mode === 'create' ? 'Создать задачу' : 'Сохранить'}
      </Button>

      {mode === 'edit' && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          {!showArchive ? (
            <button
              type="button"
              onClick={() => setShowArchive(true)}
              style={archiveLinkStyle}
            >
              Архивировать задачу
            </button>
          ) : (
            <div style={archiveConfirmStyle}>
              <p style={{ fontSize: 13.5, margin: '0 0 12px', color: 'var(--text-primary)' }}>
                Уверен(а)? Задача исчезнет у детей. История выполнений останется.
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setShowArchive(false)}
                  disabled={isPending}
                >
                  Не надо
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="md"
                  onClick={handleArchive}
                  disabled={isPending}
                >
                  Архивировать
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </form>
  );
}

// ─── Локальные UI-помощники ─────────────────────────────────────────
function Field({ children }: { children: React.ReactNode }) {
  return <div style={{ marginBottom: 22 }}>{children}</div>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11.5,
        fontWeight: 600,
        color: 'var(--text-soft)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{children}</div>
  );
}

function Input({
  value,
  onChange,
  ...rest
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 14px',
        fontFamily: 'inherit',
        fontSize: 14.5,
        color: 'var(--text-primary)',
      }}
      {...rest}
    />
  );
}

function Chip({
  active,
  children,
  onClick,
  disabled,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 12px',
        borderRadius: 'var(--radius-pill)',
        border: `1px solid ${active ? 'var(--color-ink)' : 'var(--border-default)'}`,
        background: active ? 'var(--color-ink)' : 'var(--bg-surface)',
        color: active ? 'white' : 'var(--text-soft)',
        fontFamily: 'inherit',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
  disabled,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${options.length}, 1fr)`,
        gap: 4,
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: 4,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            disabled={disabled}
            style={{
              padding: '8px 4px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: active ? 'var(--color-ink)' : 'transparent',
              color: active ? 'white' : 'var(--text-soft)',
              fontFamily: 'inherit',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      disabled={disabled}
      style={{
        width: '100%',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{label}</div>
        {description && (
          <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 3 }}>{description}</div>
        )}
      </div>
      <div
        style={{
          width: 42,
          height: 24,
          borderRadius: 100,
          background: value ? 'var(--color-coral)' : 'var(--border-default)',
          position: 'relative',
          transition: 'background 0.15s',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: value ? 20 : 2,
            width: 20,
            height: 20,
            borderRadius: 100,
            background: 'white',
            boxShadow: 'var(--shadow-sm)',
            transition: 'left 0.15s',
          }}
        />
      </div>
    </button>
  );
}

const errorStyle: React.CSSProperties = {
  background: 'var(--status-danger-soft)',
  color: 'var(--status-danger)',
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 13.5,
  marginBottom: 16,
};

const archiveLinkStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--status-danger)',
  fontSize: 13.5,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  textDecoration: 'underline',
};

const archiveConfirmStyle: React.CSSProperties = {
  background: 'var(--status-danger-soft)',
  borderRadius: 'var(--radius-lg)',
  padding: 16,
};
