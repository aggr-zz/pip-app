import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { EnterChildMode } from './EnterChildMode';
import { EditAvatarButton } from './EditAvatarButton';
import { JoinLinkCard } from './JoinLinkCard';
import { ManageChild } from './ManageChild';
import { TaskIcon, type TaskIconName } from '@/components/ui/TaskIcon';

type Profile = {
  id: string;
  family_id: string;
  role: 'parent' | 'child';
  name: string;
  birth_year: number | null;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
  avatar_emoji: string | null;
  avatar_url: string | null;
  balance: number;
  current_streak: number;
  longest_streak: number;
};

type Task = {
  id: string;
  title: string;
  icon: string;
  coin_value: number;
  schedule_type: string;
  requires_approval: boolean;
  requires_photo: boolean;
};

export default async function ChildDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Текущий родитель
  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') redirect('/');

  // Профиль ребёнка
  const { data: child } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single<Profile>();

  if (!child || child.family_id !== me.family_id || child.role !== 'child') {
    notFound();
  }

  const age = child.birth_year ? new Date().getFullYear() - child.birth_year : null;

  // Tasks assigned to this child
  const { data: assignedTasks = [] } = await supabase
    .from('tasks')
    .select('id, title, icon, coin_value, schedule_type, requires_approval, requires_photo')
    .eq('family_id', me.family_id)
    .is('archived_at', null)
    .contains('assigned_to', [child.id])
    .order('title')
    .returns<Task[]>();

  // Цель-копилка ребёнка
  const { data: goalRow } = await supabase
    .from('reward_goals')
    .select('reward_id')
    .eq('child_id', child.id)
    .maybeSingle();

  let goalReward: { id: string; title: string; icon: string; coin_cost: number } | null = null;
  if (goalRow?.reward_id) {
    const { data: rw } = await supabase
      .from('rewards')
      .select('id, title, icon, coin_cost')
      .eq('id', goalRow.reward_id)
      .maybeSingle();
    goalReward = rw ?? null;
  }

  // Build absolute join URL using request host header
  const headersList = await headers();
  const host = headersList.get('host') || 'localhost:3000';
  const proto = host.startsWith('localhost') ? 'http' : 'https';
  const joinUrl = `${proto}://${host}/join/${child.id}`;

  return (
    <main style={{ minHeight: '100%', padding: '40px 24px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Header */}
        <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
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
          <PipLogo size={26} href="/parent" />
        </header>

        {/* Child hero card */}
        <section
          style={{
            background: 'var(--color-ink)',
            color: 'white',
            borderRadius: 'var(--radius-2xl)',
            padding: '24px',
            marginBottom: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
              <Avatar
                name={child.name}
                color={child.avatar_color}
                avatarEmoji={child.avatar_emoji}
                avatarUrl={child.avatar_url}
                size="xl"
              />
              <EditAvatarButton
                profileId={child.id}
                familyId={child.family_id}
                name={child.name}
                avatarColor={child.avatar_color}
                avatarEmoji={child.avatar_emoji}
                avatarUrl={child.avatar_url}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 26,
                  letterSpacing: '-0.015em',
                  lineHeight: 1.1,
                }}
              >
                {child.name}
              </div>
              {age !== null && (
                <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4 }}>{age} {ageWord(age)}</div>
              )}
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              paddingTop: 16,
              borderTop: '1px solid rgba(255,255,255,0.1)',
              textAlign: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 22,
                  color: 'var(--color-gold)',
                }}
              >
                {child.balance}
              </div>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.65,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: 2,
                }}
              >
                Баланс PIP
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 }}>
                {child.current_streak} 🔥
              </div>
              <div
                style={{
                  fontSize: 10,
                  opacity: 0.65,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginTop: 2,
                }}
              >
                Стрик
              </div>
            </div>
          </div>
        </section>

        {/* Enter child mode (client component с PIN) */}
        <EnterChildMode childId={child.id} childName={child.name} />

        {/* Управление профилем: имя/возраст, сброс PIN, архивация */}
        <ManageChild childId={child.id} name={child.name} age={age} />

        {/* Cash payout link */}
        <Link
          href={`/parent/children/${child.id}/cash`}
          style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-xl)',
            padding: '14px 16px',
            transition: 'border-color 0.15s',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-mint-soft)',
              color: 'var(--color-mint-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Выдача наличных</div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
              Записать обмен PIP на ₽
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>

        {/* Manual adjustment link */}
        <Link
          href={`/parent/children/${child.id}/adjust`}
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-xl)',
            padding: '14px 16px',
            transition: 'border-color 0.15s',
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-gold-soft)',
              color: 'var(--color-gold-deep)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v6m0 10v6M4.22 4.22l4.24 4.24m7.08 7.08l4.24 4.24M1 12h6m10 0h6M4.22 19.78l4.24-4.24m7.08-7.08l4.24-4.24" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Корректировка баланса</div>
            <div style={{ fontSize: 12, color: 'var(--text-soft)', marginTop: 2 }}>
              Бонус или штраф, ±500 PIP
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
            <path d="M9 6l6 6-6 6" />
          </svg>
        </Link>
        {/* Цель-копилка ребёнка */}
        {goalReward && (() => {
          const pct = goalReward.coin_cost > 0
            ? Math.min(100, Math.round((child.balance / goalReward.coin_cost) * 100))
            : 100;
          const need = Math.max(0, goalReward.coin_cost - child.balance);
          const done = pct >= 100;
          return (
            <div style={{
              marginTop: 16,
              padding: '14px 16px',
              background: 'var(--bg-surface)',
              border: `1.5px solid ${done ? 'var(--color-mint)' : 'var(--color-gold)'}`,
              borderRadius: 'var(--radius-xl)',
              boxShadow: done
                ? '0 4px 16px rgba(91,168,144,0.15)'
                : '0 4px 16px rgba(242,193,78,0.12)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: done ? 'var(--color-mint-deep)' : 'var(--color-gold-deep)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                🎯 Мечтает о
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #FFE39A, #D4A12E)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>
                  {goalReward.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {goalReward.title}
                  </div>
                  <div style={{ height: 7, background: 'rgba(0,0,0,0.08)', borderRadius: 100, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: done
                        ? 'linear-gradient(90deg, var(--color-mint), var(--color-mint-deep))'
                        : 'linear-gradient(90deg, var(--color-gold), var(--color-gold-deep))',
                      borderRadius: 100, transition: 'width 0.4s ease',
                      minWidth: pct > 0 ? 6 : 0,
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-soft)' }}>
                    <span style={{ fontWeight: 600, color: done ? 'var(--color-mint-deep)' : 'var(--text-soft)' }}>
                      {done ? '🎉 Накоплено! Можно порадовать' : `ещё ${need} PIP`}
                    </span>
                    <span>{child.balance} / {goalReward.coin_cost}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Assigned tasks */}
        <section style={{ marginTop: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', marginBottom: 10,
          }}>
            <div style={{
              fontSize: 11.5, fontWeight: 700,
              color: 'var(--text-soft)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              Задания ({assignedTasks?.length ?? 0})
            </div>
            <a
              href="/parent/tasks/new"
              style={{
                fontSize: 12, fontWeight: 600,
                color: 'var(--color-coral)', textDecoration: 'none',
                padding: '4px 10px',
                background: 'var(--color-coral-soft)',
                borderRadius: 100,
              }}
            >
              + Добавить
            </a>
          </div>

          {assignedTasks?.length === 0 ? (
            <div style={{
              padding: '20px', textAlign: 'center',
              background: 'var(--bg-surface)',
              border: '1px dashed var(--border-default)',
              borderRadius: 'var(--radius-xl)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                Нет заданий — <a href="/parent/tasks/new" style={{ color: 'var(--color-coral)', textDecoration: 'none', fontWeight: 600 }}>создай первое</a>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {assignedTasks?.map((task) => (
                <a
                  key={task.id}
                  href={`/parent/tasks/${task.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '12px 14px',
                    textDecoration: 'none',
                  }}
                >
                  {/* Icon */}
                  <TaskIcon name={task.icon as TaskIconName} size={38} />

                  {/* Title + schedule */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, fontSize: 14,
                      color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {task.title}
                    </div>
                    <div style={{
                      fontSize: 11.5, color: 'var(--text-muted)',
                      marginTop: 2,
                    }}>
                      {scheduleLabel(task.schedule_type)} · {task.coin_value} PIP
                    </div>
                  </div>

                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {task.requires_approval && (
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 100,
                        background: 'var(--color-gold-soft)',
                        color: 'var(--color-gold-deep)',
                        whiteSpace: 'nowrap',
                      }}>
                        ✅ проверка
                      </span>
                    )}
                    {task.requires_photo && (
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 100,
                        background: 'var(--color-coral-soft)',
                        color: 'var(--color-coral-deep)',
                        whiteSpace: 'nowrap',
                      }}>
                        📷 фото
                      </span>
                    )}
                    {!task.requires_approval && (
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        padding: '2px 7px', borderRadius: 100,
                        background: 'var(--color-mint-soft)',
                        color: 'var(--color-mint-deep)',
                        whiteSpace: 'nowrap',
                      }}>
                        ⚡ авто
                      </span>
                    )}
                  </div>

                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Join link + QR code */}
        <JoinLinkCard joinUrl={joinUrl} childName={child.name} />
      </div>
    </main>
  );
}

function scheduleLabel(type: string): string {
  if (type === 'daily') return 'Каждый день';
  if (type === 'weekdays') return 'Пн–Пт';
  if (type === 'custom') return 'По дням';
  if (type === 'once') return 'Разово';
  return type;
}

function ageWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'год';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'года';
  return 'лет';
}
