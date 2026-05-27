import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PipLogo } from '@/components/ui/PipLogo';
import { AddChildForm } from './AddChildForm';

export default async function NewChildPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (!me || me.role !== 'parent') redirect('/');

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'start center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <header style={{ marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/parent" aria-label="Назад" style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 100,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </Link>
          <PipLogo size={28} href="/parent" />
        </header>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 32,
          letterSpacing: '-0.02em',
          margin: '0 0 8px',
          lineHeight: 1.05,
        }}>
          Добавить ребёнка
        </h1>
        <p style={{ color: 'var(--text-soft)', fontSize: 14.5, margin: '0 0 28px', lineHeight: 1.5 }}>
          Создадим профиль с PIN-кодом. Чтобы ребёнок мог зайти в свой
          режим — введёт этот PIN на твоём устройстве.
        </p>

        <AddChildForm />
      </div>
    </main>
  );
}
