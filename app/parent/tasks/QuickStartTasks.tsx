'use client';

import { useState, useTransition } from 'react';
import { createTask } from './actions';
import { TaskIcon } from '@/components/ui/TaskIcon';
import type { TaskIconName } from '@/components/ui/TaskIcon';

interface Template {
  title: string;
  icon: TaskIconName;
  coin_value: number;
  schedule_type: 'daily' | 'weekdays';
}

const TEMPLATES: Template[] = [
  { title: 'Почистить зубы',          icon: 'teeth',    coin_value: 5,  schedule_type: 'daily'    },
  { title: 'Принять душ',             icon: 'shower',   coin_value: 8,  schedule_type: 'daily'    },
  { title: 'Убраться в комнате',      icon: 'cleaning', coin_value: 15, schedule_type: 'daily'    },
  { title: 'Сделать домашнее задание',icon: 'homework', coin_value: 20, schedule_type: 'weekdays' },
  { title: 'Собраться в школу',       icon: 'school',   coin_value: 10, schedule_type: 'weekdays' },
  { title: 'Застелить кровать',       icon: 'bedroom',  coin_value: 7,  schedule_type: 'daily'    },
  { title: 'Помыть посуду',           icon: 'dishes',   coin_value: 12, schedule_type: 'daily'    },
  { title: 'Вынести мусор',           icon: 'trash',    coin_value: 10, schedule_type: 'daily'    },
  { title: 'Почитать книгу',          icon: 'reading',  coin_value: 15, schedule_type: 'daily'    },
  { title: 'Зарядка',                 icon: 'sport',    coin_value: 15, schedule_type: 'daily'    },
  { title: 'Лечь спать вовремя',      icon: 'sleep',    coin_value: 10, schedule_type: 'daily'    },
  { title: 'Помочь с ужином',         icon: 'cooking',  coin_value: 12, schedule_type: 'daily'    },
];

interface QuickStartTasksProps {
  childIds: string[];
}

export function QuickStartTasks({ childIds }: QuickStartTasksProps) {
  const [added, setAdded]     = useState<Set<number>>(new Set());
  const [errors, setErrors]   = useState<Record<number, string>>({});
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [, startTransition]   = useTransition();

  async function handleAdd(template: Template, idx: number) {
    if (added.has(idx) || loadingIdx === idx) return;
    setLoadingIdx(idx);
    setErrors((prev) => { const next = { ...prev }; delete next[idx]; return next; });

    startTransition(async () => {
      const result = await createTask({
        title: template.title,
        description: null,
        icon: template.icon,
        coin_value: template.coin_value,
        schedule_type: template.schedule_type,
        schedule_days: null,
        requires_approval: false,
        requires_photo: false,
        assigned_to: childIds,
      });

      if (result.ok) {
        setAdded((prev) => new Set([...prev, idx]));
      } else {
        setErrors((prev) => ({ ...prev, [idx]: result.error }));
      }
      setLoadingIdx(null);
    });
  }

  const addedCount = added.size;

  return (
    <div style={{ marginTop: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <h3
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 17,
            margin: 0,
            color: 'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          Быстрый старт
        </h3>
        {addedCount > 0 && (
          <span style={{ fontSize: 12.5, color: 'var(--color-mint-deep)', fontWeight: 600 }}>
            {addedCount} добавлено ✓
          </span>
        )}
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--text-soft)', margin: '0 0 16px', lineHeight: 1.5 }}>
        Готовые задания — добавь одним нажатием, потом измени как нужно
      </p>

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TEMPLATES.map((t, idx) => {
          const isAdded   = added.has(idx);
          const isLoading = loadingIdx === idx;
          const err       = errors[idx];

          return (
            <div key={idx}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: isAdded ? 'var(--color-mint-soft)' : 'var(--bg-surface)',
                  border: `1px solid ${isAdded ? 'var(--color-mint-deep)' : 'var(--border-soft)'}`,
                  borderRadius: 'var(--radius-lg)',
                  transition: 'all 0.2s ease',
                  opacity: isAdded ? 0.7 : 1,
                }}
              >
                <TaskIcon name={t.icon} size={36} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 13.5,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {t.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 2 }}>
                    {t.schedule_type === 'daily' ? 'Каждый день' : 'Пн–Пт'} · {t.coin_value} pip
                  </div>
                </div>

                <button
                  onClick={() => handleAdd(t, idx)}
                  disabled={isAdded || isLoading}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: 'none',
                    background: isAdded
                      ? 'var(--color-mint-deep)'
                      : isLoading
                        ? 'var(--border-default)'
                        : 'var(--color-ink)',
                    color: 'white',
                    fontSize: isAdded ? 14 : 20,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isAdded ? 'default' : isLoading ? 'wait' : 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                    lineHeight: 1,
                  }}
                  aria-label={isAdded ? 'Добавлено' : `Добавить "${t.title}"`}
                >
                  {isLoading ? '…' : isAdded ? '✓' : '+'}
                </button>
              </div>

              {err && (
                <div style={{ fontSize: 11.5, color: 'var(--color-coral)', marginTop: 4, paddingLeft: 4 }}>
                  {err}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
