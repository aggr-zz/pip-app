'use client';

import { useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { TaskIcon, ICON_EMOJI, type TaskIconName } from '@/components/ui/TaskIcon';

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

function CheckSvg() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function safeIcon(icon: string): TaskIconName | null {
  return ICON_EMOJI[icon as TaskIconName] ? (icon as TaskIconName) : null;
}

export function ChildrenPanel({ children, defaultExpandedId }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(defaultExpandedId ?? null);

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
        @keyframes pip-panel-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children.map((child) => {
          const isExpanded = expandedId === child.id;
          const hasPending = child.pendingApprovals.length > 0;
          const availableCount = child.todayTasks.filter((t) => t.status === 'available').length;
          const doneCount = child.todayTasks.filter((t) => t.status === 'done').length;
          const totalToday = child.todayTasks.length;

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
                boxShadow: hasPending ? '0 2px 14px rgba(238,108,77,0.13)' : 'none',
              }}
            >
              {/* ── Child header row ───────────────────────────────── */}
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
                {/* Avatar with dot badge if pending */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar
                    name={child.name}
                    color={child.avatar_color}
                    avatarEmoji={child.avatar_emoji}
                    avatarUrl={child.avatar_url}
                    size="md"
                  />
                  {hasPending && (
                    <span style={{
                      position: 'absolute', top: 0, right: 0,
                      width: 10, height: 10, borderRadius: '50%',
                      background: 'var(--color-coral)',
                      border: '2px solid var(--bg-surface)',
                      pointerEvents: 'none',
                    }} />
                  )}
                </div>

                {/* Name + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                    {child.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2, display: 'flex', gap: 8 }}>
                    <span>🔥 {child.current_streak}</span>
                    {totalToday > 0 && (
                      <span style={{ color: doneCount === totalToday ? 'var(--color-mint)' : 'var(--text-muted)' }}>
                        {doneCount}/{totalToday} сделано
                      </span>
                    )}
                  </div>
                </div>

                {/* Balance pill */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'var(--color-gold-soft)', borderRadius: 100,
                  padding: '4px 10px 4px 7px', flexShrink: 0,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="var(--color-gold)" />
                    <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold"
                      fill="rgba(255,255,255,0.9)" fontFamily="sans-serif">P</text>
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
                    padding: '12px 12px 14px',
                    animation: 'pip-panel-in 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {/* ── Pending approvals ─────────────────────────── */}
                  {child.pendingApprovals.length > 0 && (
                    <>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--color-coral)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        marginBottom: 2, paddingLeft: 2,
                      }}>
                        ⚡ На проверку
                      </div>
                      {child.pendingApprovals.map((approval) => {
                        const iconName = safeIcon(approval.taskIcon);
                        return (
                          <a
                            key={approval.completionId}
                            href={`/parent/approvals/${approval.completionId}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-soft)',
                              borderRadius: 'var(--radius-lg)',
                              padding: '12px 14px',
                              textDecoration: 'none',
                            }}
                          >
                            {/* Coral circle indicator — matches TaskRow checkbox */}
                            <div style={{
                              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                              background: 'var(--color-coral-soft)',
                              border: '2px solid var(--color-coral)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                stroke="var(--color-coral)" strokeWidth="3" strokeLinecap="round">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </div>

                            {/* Title + subtitle */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 500, fontSize: 15,
                                color: 'var(--text-primary)',
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                lineHeight: 1.3,
                              }}>
                                {approval.taskTitle}
                              </div>
                              <div style={{
                                fontSize: 11.5, color: 'var(--color-coral)',
                                marginTop: 2, display: 'flex', gap: 8,
                              }}>
                                <span>+{approval.coinValue} PIP</span>
                                {approval.hasPhoto && <span>📸 фото</span>}
                              </div>
                            </div>

                            {/* Task icon with dot — same side as TaskRow */}
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              {iconName ? (
                                <TaskIcon name={iconName} size={44} colored={false} />
                              ) : (
                                <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>✅</div>
                              )}
                              {/* Small dot badge */}
                              <span style={{
                                position: 'absolute', top: 2, right: 2,
                                width: 8, height: 8, borderRadius: '50%',
                                background: 'var(--color-coral)',
                                border: '1.5px solid var(--bg-surface)',
                                pointerEvents: 'none',
                              }} />
                            </div>
                          </a>
                        );
                      })}
                    </>
                  )}

                  {/* ── Today's tasks — only available (pending shown above) ── */}
                  {child.todayTasks.filter((t) => t.status === 'available').length > 0 && (
                    <>
                      <div style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        marginTop: child.pendingApprovals.length > 0 ? 8 : 0,
                        marginBottom: 2, paddingLeft: 2,
                      }}>
                        Сегодня
                      </div>
                      {child.todayTasks.filter((t) => t.status === 'available').map((task) => {
                        const isDone = task.status === 'done';
                        const isPending = task.status === 'pending';
                        const iconName = safeIcon(task.icon);

                        return (
                          <div
                            key={task.taskId}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-soft)',
                              borderRadius: 'var(--radius-lg)',
                              padding: '12px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                            }}
                          >
                            {/* Circular checkbox — same as TaskRow */}
                            <div
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                ...(isDone ? {
                                  background: 'var(--color-mint)',
                                  border: '2px solid var(--color-mint)',
                                } : isPending ? {
                                  background: 'var(--color-gold-soft)',
                                  border: '2px solid var(--color-gold)',
                                } : {
                                  background: 'transparent',
                                  border: '2px solid var(--border-default)',
                                }),
                              }}
                            >
                              {isDone && <CheckSvg />}
                              {isPending && (
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-gold)' }} />
                              )}
                            </div>

                            {/* Title + subtitle */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontWeight: 500,
                                fontSize: 15,
                                color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                                textDecoration: isDone ? 'line-through' : 'none',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                lineHeight: 1.3,
                              }}>
                                {task.title}
                              </div>
                              {!isDone && (
                                <div style={{
                                  fontSize: 11.5,
                                  color: isPending ? 'var(--color-gold-deep)' : 'var(--text-soft)',
                                  marginTop: 2,
                                }}>
                                  {isPending ? 'ждёт подтверждения' : `${task.coinValue} PIP`}
                                </div>
                              )}
                            </div>

                            {/* Task icon — same as TaskRow (colored=false) */}
                            {iconName ? (
                              <TaskIcon name={iconName} size={44} colored={false} />
                            ) : (
                              <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                                ✅
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}

                  {child.pendingApprovals.length === 0 && child.todayTasks.filter((t) => t.status === 'available').length === 0 && (
                    <div style={{
                      textAlign: 'center', padding: '16px 0',
                      color: 'var(--text-soft)', fontSize: 13,
                    }}>
                      Нет заданий на сегодня
                    </div>
                  )}

                  {/* Link to child page */}
                  <a
                    href={`/child/${child.id}`}
                    style={{
                      marginTop: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      fontSize: 12.5,
                      color: 'var(--color-coral)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      padding: '8px 0',
                      borderTop: '1px solid var(--border-soft)',
                    }}
                  >
                    Открыть экран {child.name} →
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
