'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';

type AvatarColor = 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';

export type PendingApproval = {
  completionId: string;
  taskTitle: string;
  taskIcon: string;
  coinValue: number;
  hasPhoto: boolean;
  completedAt: string;
};

export type TodayTask = {
  taskId: string;
  title: string;
  icon: string;
  coinValue: number;
  status: 'done' | 'pending' | 'available';
};

export type ChildData = {
  id: string;
  name: string;
  avatar_color: AvatarColor;
  avatar_emoji: string | null;
  avatar_url: string | null;
  balance: number;
  current_streak: number;
  pendingApprovals: PendingApproval[];
  todayTasks: TodayTask[];
};

interface Props {
  children: ChildData[];
  defaultExpandedId?: string | null;
}

export function ChildrenPanel({ children, defaultExpandedId }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(
    defaultExpandedId ?? (children[0]?.id ?? null)
  );

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (children.length === 0) {
    return (
      <div
        style={{
          padding: '48px 24px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-soft)',
          borderRadius: 'var(--radius-2xl)',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 14 }}>👋</div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: 22,
            letterSpacing: '-0.01em',
            marginBottom: 10,
          }}
        >
          Добавь первого ребёнка
        </div>
        <p style={{ color: 'var(--text-soft)', fontSize: 14, lineHeight: 1.55, margin: '0 0 24px' }}>
          PIP начинает работать когда в семье появляется ребёнок. Создадим его профиль!
        </p>
        <a
          href="/parent/children/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--color-ink)',
            color: 'white',
            padding: '12px 22px',
            borderRadius: 'var(--radius-lg)',
            fontWeight: 600,
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          + Добавить ребёнка
        </a>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes pip-pulse-ring {
          0%   { opacity: 0.9; transform: scale(1);   }
          60%  { opacity: 0;   transform: scale(1.9); }
          100% { opacity: 0;   transform: scale(1.9); }
        }
        @keyframes pip-fade-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children.map((child) => {
          const isExpanded = expandedId === child.id;
          const hasPending = child.pendingApprovals.length > 0;
          const availableCount = child.todayTasks.filter((t) => t.status === 'available').length;

          return (
            <div
              key={child.id}
              style={{
                background: 'var(--bg-surface)',
                border: hasPending
                  ? '1.5px solid var(--color-coral)'
                  : '1px solid var(--border-soft)',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                boxShadow: hasPending ? '0 2px 12px rgba(238,108,77,0.12)' : 'none',
              }}
            >
              {/* ── Child row (always visible) ─────────────────────── */}
              <button
                type="button"
                onClick={() => toggle(child.id)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textAlign: 'left',
                }}
              >
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    name={child.name}
                    color={child.avatar_color}
                    avatarEmoji={child.avatar_emoji}
                    avatarUrl={child.avatar_url}
                    size="md"
                  />
                  {/* Pulsing ring if pending */}
                  {hasPending && (
                    <>
                      <span style={{
                        position: 'absolute', inset: -3, borderRadius: '50%',
                        border: '2px solid var(--color-coral)',
                        animation: 'pip-pulse-ring 1.8s ease-out infinite',
                        pointerEvents: 'none',
                      }} />
                      <span style={{
                        position: 'absolute', inset: -3, borderRadius: '50%',
                        border: '2px solid var(--color-coral)',
                        animation: 'pip-pulse-ring 1.8s ease-out 0.6s infinite',
                        pointerEvents: 'none',
                      }} />
                    </>
                  )}
                </div>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                    {child.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2, display: 'flex', gap: 8 }}>
                    <span>🔥 {child.current_streak}</span>
                    {availableCount > 0 && (
                      <span style={{ color: 'var(--text-muted)' }}>
                        {availableCount} не выполнено
                      </span>
                    )}
                  </div>
                </div>

                {/* Balance */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'var(--color-gold-soft)', borderRadius: 100,
                  padding: '4px 10px 4px 7px', flexShrink: 0,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="var(--color-gold)" />
                    <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="rgba(255,255,255,0.9)" fontFamily="sans-serif">P</text>
                  </svg>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--color-gold-deep)' }}>
                    {child.balance}
                  </span>
                </div>

                {/* Pending badge */}
                {hasPending && (
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--color-coral)', color: 'white',
                    fontSize: 11, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {child.pendingApprovals.length}
                  </div>
                )}

                {/* Chevron */}
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"
                  style={{
                    flexShrink: 0,
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.25s ease',
                  }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {/* ── Expanded panel ─────────────────────────────────── */}
              {isExpanded && (
                <div
                  style={{
                    borderTop: '1px solid var(--border-soft)',
                    padding: '12px 14px 14px',
                    animation: 'pip-fade-in 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {/* Pending approvals */}
                  {child.pendingApprovals.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-coral)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
                        ⚡ На проверку
                      </div>
                      {child.pendingApprovals.map((approval) => (
                        <a
                          key={approval.completionId}
                          href={`/parent/approvals/${approval.completionId}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            background: 'var(--color-coral-soft)',
                            border: '1px solid var(--color-coral)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '10px 12px',
                            textDecoration: 'none',
                            position: 'relative',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Pulsing icon */}
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <span style={{ fontSize: 22 }}>{approval.taskIcon}</span>
                            <span style={{
                              position: 'absolute',
                              inset: -4,
                              borderRadius: '50%',
                              border: '2px solid var(--color-coral)',
                              animation: 'pip-pulse-ring 1.5s ease-out infinite',
                            }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--color-coral-deep)', lineHeight: 1.2 }}>
                              {approval.taskTitle}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--color-coral-deep)', opacity: 0.75, marginTop: 2, display: 'flex', gap: 6 }}>
                              <span>+{approval.coinValue} PIP</span>
                              {approval.hasPhoto && <span>📸 фото</span>}
                            </div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="var(--color-coral)" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M9 6l6 6-6 6" />
                          </svg>
                        </a>
                      ))}
                    </>
                  )}

                  {/* Today's tasks */}
                  {child.todayTasks.length > 0 && (
                    <>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: child.pendingApprovals.length > 0 ? 6 : 0, marginBottom: 2 }}>
                        Сегодня
                      </div>
                      {child.todayTasks.map((task) => {
                        const isDone = task.status === 'done';
                        const isPending = task.status === 'pending';
                        return (
                          <div
                            key={task.taskId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              background: isDone
                                ? 'var(--color-mint-soft)'
                                : isPending
                                  ? 'var(--color-gold-soft)'
                                  : 'var(--bg-surface-2)',
                              border: isDone
                                ? '1px solid var(--color-mint)'
                                : isPending
                                  ? '1px solid var(--color-gold)'
                                  : '1px solid var(--border-soft)',
                              borderRadius: 'var(--radius-lg)',
                              padding: '9px 12px',
                              opacity: isDone ? 0.75 : 1,
                            }}
                          >
                            {/* Status dot */}
                            <div style={{
                              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: isDone ? 'var(--color-mint)' : isPending ? 'var(--color-gold-soft)' : 'transparent',
                              border: isDone ? '2px solid var(--color-mint)' : isPending ? '2px solid var(--color-gold)' : '2px solid var(--border-default)',
                            }}>
                              {isDone && (
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                                  stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                              {isPending && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-gold)' }} />}
                            </div>

                            <span style={{ fontSize: 20, flexShrink: 0 }}>{task.icon}</span>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 500, fontSize: 13.5,
                                color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                                textDecoration: isDone ? 'line-through' : 'none',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {task.title}
                              </div>
                              {isPending && (
                                <div style={{ fontSize: 11, color: 'var(--color-gold-deep)', marginTop: 1 }}>
                                  ждёт подтверждения
                                </div>
                              )}
                            </div>

                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-soft)', flexShrink: 0 }}>
                              {task.coinValue} PIP
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}

                  {child.pendingApprovals.length === 0 && child.todayTasks.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-soft)', fontSize: 13 }}>
                      Нет заданий на сегодня
                    </div>
                  )}

                  {/* Link to child's full view */}
                  <a
                    href={`/child/${child.id}`}
                    style={{
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: 'var(--color-coral)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      padding: '6px 0',
                    }}
                  >
                    Открыть страницу {child.name} →
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
