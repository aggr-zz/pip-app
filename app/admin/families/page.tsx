import Link from 'next/link';
import { requireAdmin } from '@/lib/admin';

type FamilyRow = {
  id: string;
  name: string;
  created_at: string;
  child_count: number;
  parent_count: number;
  total_pip_balance: number;
  task_count: number;
  last_activity: string | null;
};

export default async function AdminFamiliesPage() {
  const { supabase } = await requireAdmin('/admin/families');

  const { data: families = [] } = await supabase
    .rpc('admin_families_overview')
    .returns<FamilyRow[]>();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 32,
          letterSpacing: '-0.02em',
          margin: '0 0 6px',
          lineHeight: 1.05,
        }}
      >
        Семьи
      </h1>
      <p style={{ color: 'var(--text-soft)', fontSize: 14.5, margin: '0 0 24px' }}>
        {families?.length ?? 0} зарегистрированных · отсортировано по последней активности
      </p>

      {(!families || families.length === 0) ? (
        <div
          style={{
            padding: '48px 24px',
            background: 'var(--bg-surface)',
            border: '1px dashed var(--border-default)',
            borderRadius: 'var(--radius-2xl)',
            textAlign: 'center',
            color: 'var(--text-soft)',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 12 }}>🏠</div>
          <p style={{ margin: 0, fontSize: 14 }}>Пока никто не зарегистрировался. Жди первой семьи.</p>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-xl)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 80px 80px 100px 100px 130px 40px',
              padding: '10px 16px',
              background: 'var(--bg-surface-2)',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-soft)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: '1px solid var(--border-soft)',
            }}
          >
            <div>Семья</div>
            <div>Род.</div>
            <div>Дети</div>
            <div>Задач</div>
            <div>pip</div>
            <div>Активность</div>
            <div />
          </div>
          {families.map((f) => (
            <Link
              key={f.id}
              href={`/admin/families/${f.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 80px 100px 100px 130px 40px',
                padding: '14px 16px',
                fontSize: 13.5,
                borderBottom: '1px solid var(--border-soft)',
                alignItems: 'center',
                color: 'inherit',
                transition: 'background 0.1s',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {f.id.slice(0, 8)}… · с {formatDate(f.created_at)}
                </div>
              </div>
              <div>{f.parent_count}</div>
              <div>{f.child_count || '—'}</div>
              <div>{f.task_count || '—'}</div>
              <div style={{ fontWeight: 600 }}>{f.total_pip_balance.toLocaleString('ru-RU')}</div>
              <div style={{ color: f.last_activity ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 12 }}>
                {f.last_activity ? timeAgo(f.last_activity) : 'нет'}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
                <path d="M9 6l6 6-6 6" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(d);
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} дн`;
  return formatDate(iso);
}
