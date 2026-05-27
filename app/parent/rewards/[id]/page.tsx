import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { CoinPill } from '@/components/ui/Coin';
import { ArchiveRewardButton } from './ArchiveRewardButton';

export default async function RewardDetailPage({
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

  const { data: reward } = await supabase
    .from('rewards')
    .select('*')
    .eq('id', id)
    .single();

  if (!reward || reward.family_id !== me.family_id) notFound();

  // Получаем имена детей если ограничено
  let availableChildren: { id: string; name: string; avatar_color: string }[] = [];
  if (reward.available_to && reward.available_to.length > 0) {
    const { data } = await supabase
      .from('profiles')
      .select('id, name, avatar_color')
      .in('id', reward.available_to);
    availableChildren = data ?? [];
  }

  return (
    <main style={{ minHeight: '100%', padding: '40px 24px 64px' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <header style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href="/parent/rewards"
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

        {/* Reward card */}
        <section
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-2xl)',
            padding: 24,
            marginBottom: 20,
            opacity: reward.archived_at ? 0.7 : 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'var(--color-gold-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 38,
                flexShrink: 0,
              }}
            >
              {reward.icon || '🎁'}
            </div>
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
                {reward.title}
              </div>
              {reward.description && (
                <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 4, lineHeight: 1.5 }}>
                  {reward.description}
                </div>
              )}
            </div>
            <CoinPill amount={reward.coin_cost} />
          </div>

          <div
            style={{
              paddingTop: 16,
              borderTop: '1px solid var(--border-soft)',
              fontSize: 13,
              color: 'var(--text-soft)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <Row label="Лимит">
              {reward.limit_type === 'once' ? 'Один раз' : 'Без ограничения'}
            </Row>
            <Row label="Кому">
              {availableChildren.length > 0 ? (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {availableChildren.map((c) => (
                    <span
                      key={c.id}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <Avatar
                        name={c.name}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        color={c.avatar_color as any}
                        size="xs"
                      />
                      {c.name}
                    </span>
                  ))}
                </div>
              ) : (
                'Всем детям'
              )}
            </Row>
            {reward.archived_at && (
              <Row label="Статус">
                <span style={{ color: 'var(--text-muted)' }}>В архиве</span>
              </Row>
            )}
          </div>
        </section>

        <ArchiveRewardButton rewardId={reward.id} archived={!!reward.archived_at} />

        <div
          style={{
            marginTop: 16,
            padding: '12px 14px',
            background: 'var(--bg-surface-2)',
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius-md)',
            fontSize: 12,
            color: 'var(--text-soft)',
            lineHeight: 1.55,
          }}
        >
          Редактирование наград — в Sprint 7. Пока можно архивировать и создать новую.
        </div>
      </div>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 16 }}>
      <div style={{ width: 80, color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ flex: 1, color: 'var(--text-primary)' }}>{children}</div>
    </div>
  );
}
