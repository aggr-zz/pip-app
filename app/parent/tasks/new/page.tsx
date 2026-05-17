import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { TaskForm } from '../TaskForm';

type Child = {
  id: string;
  name: string;
  avatar_color: 'coral' | 'mint' | 'ink' | 'gold' | 'rose' | 'sky';
};

export default async function NewTaskPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('family_id, role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') redirect('/');

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
              <path d="M18 6L6 18M6 6l12 12" />
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
          Новая задача
        </h1>
        <p
          style={{
            color: 'var(--text-soft)',
            fontSize: 14.5,
            margin: '0 0 28px',
            lineHeight: 1.5,
          }}
        >
          Опиши, что должен делать ребёнок, и сколько монет начислять.
        </p>

        <TaskForm mode="create" children={children ?? []} />
      </div>
    </main>
  );
}
