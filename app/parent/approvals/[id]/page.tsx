import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinPill, CoinDot } from '@/components/ui/Coin';
import { TaskIcon, type TaskIconName } from '@/components/ui/TaskIcon';
import { ApprovalActions } from './ApprovalActions';
import { getPhotoUrl } from '../actions';

export default async function ApprovalDetailPage({
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

  // Completion + task + child profile в одном запросе
  const { data: completion } = await supabase
    .from('task_completions')
    .select('id, task_id, profile_id, status, completed_at, scheduled_for, photo_path, awarded_coins, rejection_reason')
    .eq('id', id)
    .single();

  if (!completion) notFound();

  const { data: task } = await supabase
    .from('tasks')
    .select('id, family_id, title, description, icon, coin_value, requires_photo')
    .eq('id', completion.task_id)
    .single();

  if (!task || task.family_id !== me.family_id) notFound();

  const { data: child } = await supabase
    .from('profiles')
    .select('id, name, avatar_color, balance, current_streak')
    .eq('id', completion.profile_id)
    .single();

  if (!child) notFound();

  // Если уже не pending — показываем итоговую версию (полезно для возврата по истории)
  const isPending = completion.status === 'pending';

  // Signed URL для фото
  const photoUrl = completion.photo_path ? await getPhotoUrl(completion.photo_path) : null;

  return (
    <main style={{ minHeight: '100%', padding: '40px 24px 64px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
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
          <PipLogo size={28} href="/parent" />
        </header>

        {!isPending && (
          <div
            style={{
              background:
                completion.status === 'approved' || completion.status === 'auto_approved'
                  ? 'var(--color-mint-soft)'
                  : 'var(--status-danger-soft)',
              border: `1px solid ${
                completion.status === 'approved' || completion.status === 'auto_approved'
                  ? 'var(--color-mint)'
                  : 'var(--status-danger)'
              }`,
              color:
                completion.status === 'approved' || completion.status === 'auto_approved'
                  ? 'var(--color-mint-deep)'
                  : 'var(--status-danger)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              marginBottom: 20,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {completion.status === 'approved' && `Подтверждено · начислено ${completion.awarded_coins ?? 0} PIP`}
            {completion.status === 'auto_approved' && `Автоподтверждено · начислено ${completion.awarded_coins ?? 0} PIP`}
            {completion.status === 'rejected' && `Отклонено: ${completion.rejection_reason ?? ''}`}
          </div>
        )}

        {/* Task card */}
        <section
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-2xl)',
            padding: '24px',
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <TaskIcon name={task.icon as TaskIconName} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 22,
                  letterSpacing: '-0.015em',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                }}
              >
                {task.title}
              </div>
              {task.description && (
                <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4 }}>
                  {task.description}
                </div>
              )}
            </div>
            <CoinPill amount={task.coin_value} />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              paddingTop: 16,
              borderTop: '1px solid var(--border-soft)',
            }}
          >
            <Avatar name={child.name} color={child.avatar_color} size="sm" />
            <div style={{ flex: 1, fontSize: 14 }}>
              <div style={{ fontWeight: 600 }}>{child.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                отметил(а) {timeAgo(completion.completed_at)}
              </div>
            </div>
          </div>
        </section>

        {/* Photo */}
        {completion.photo_path && (
          <section style={{ marginBottom: 20 }}>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt="Фото-доказательство"
                style={{
                  width: '100%',
                  borderRadius: 'var(--radius-2xl)',
                  display: 'block',
                  border: '1px solid var(--border-soft)',
                }}
              />
            ) : (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  background: 'var(--bg-surface-2)',
                  borderRadius: 'var(--radius-2xl)',
                  color: 'var(--text-soft)',
                  fontSize: 13,
                }}
              >
                Не удалось загрузить фото
              </div>
            )}
            <div
              style={{
                fontSize: 11.5,
                color: 'var(--text-muted)',
                marginTop: 8,
                textAlign: 'center',
              }}
            >
              Фото удалится после подтверждения или отклонения
            </div>
          </section>
        )}

        {/* Approve / Reject */}
        {isPending ? (
          <ApprovalActions
            completionId={completion.id}
            fullAmount={task.coin_value}
            childName={child.name}
          />
        ) : (
          <Link
            href="/parent"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
              fontWeight: 600,
              fontSize: 14.5,
            }}
          >
            На главную
          </Link>
        )}

        {/* Info */}
        <div
          style={{
            marginTop: 24,
            padding: '12px 16px',
            background: 'var(--bg-surface-2)',
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            color: 'var(--text-soft)',
            lineHeight: 1.55,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <CoinDot size={10} />
            <strong style={{ color: 'var(--text-primary)' }}>Текущий баланс {child.name}: {child.balance} PIP</strong>
          </div>
          {isPending && (
            <div>
              После подтверждения сумма прибавится. Можно начислить меньше — например, если задача сделана наполовину.
            </div>
          )}
        </div>
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
