import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { PipLogo } from '@/components/ui/PipLogo';
import { Avatar } from '@/components/ui/Avatar';
import { PinEntry } from './PinEntry';

export default async function JoinPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { childId } = await params;

  // Публичный запрос — используем admin-клиент, но отдаём минимум данных
  const supabase = createAdminClient();
  const { data: child } = await supabase
    .from('profiles')
    .select('id, name, avatar_color, avatar_emoji, avatar_url, role, archived_at')
    .eq('id', childId)
    .single();

  if (!child || child.role !== 'child' || child.archived_at) {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        background: 'var(--bg-page)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 380 }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 40 }}>
          <PipLogo size={36} />
        </div>

        {/* Avatar + Name */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Avatar
              name={child.name}
              color={child.avatar_color}
              avatarEmoji={child.avatar_emoji}
              avatarUrl={child.avatar_url}
              size="xl"
            />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 30,
              letterSpacing: '-0.02em',
              margin: '0 0 6px',
            }}
          >
            Привет, {child.name}! 👋
          </h1>
        </div>

        {/* PIN entry */}
        <PinEntry childId={child.id} childName={child.name} />
      </div>
    </main>
  );
}
