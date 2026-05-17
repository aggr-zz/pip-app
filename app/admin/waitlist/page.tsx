import { requireAdmin } from '@/lib/admin';

type WaitlistRow = {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  created_at: string;
};

export default async function AdminWaitlistPage() {
  const { supabase } = await requireAdmin('/admin/waitlist');

  const { data: emails = [], count } = await supabase
    .from('waitlist')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .returns<WaitlistRow[]>();

  // Группировка по дате для статистики
  const bySource = new Map<string, number>();
  for (const row of emails ?? []) {
    const src = row.source || '—';
    bySource.set(src, (bySource.get(src) || 0) + 1);
  }
  const sources = Array.from(bySource.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
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
            Waitlist
          </h1>
          <p style={{ color: 'var(--text-soft)', fontSize: 14.5, margin: 0 }}>
            {count ?? 0} email-ов всего
          </p>
        </div>

        <a
          href="/admin/waitlist/export"
          download="pip-waitlist.csv"
          style={{
            background: 'var(--color-ink)',
            color: 'white',
            padding: '11px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: 13.5,
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            textDecoration: 'none',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Экспорт CSV
        </a>
      </div>

      {/* Sources */}
      {sources.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 16,
              margin: '0 0 10px',
            }}
          >
            По источникам
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {sources.map(([src, n]) => (
              <div
                key={src}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius-pill)',
                  padding: '6px 14px',
                  fontSize: 12.5,
                }}
              >
                <span style={{ color: 'var(--text-soft)' }}>{src}</span>{' '}
                <strong>{n}</strong>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Table */}
      {(!emails || emails.length === 0) ? (
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
          <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
          <p style={{ margin: 0, fontSize: 14 }}>Пока пусто. Жди первых регистраций на лендинге.</p>
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
              gridTemplateColumns: '1fr 200px 140px 130px',
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
            <div>Email</div>
            <div>Имя</div>
            <div>Источник</div>
            <div>Когда</div>
          </div>
          {emails.map((row) => (
            <div
              key={row.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 200px 140px 130px',
                padding: '12px 16px',
                fontSize: 13.5,
                borderBottom: '1px solid var(--border-soft)',
                alignItems: 'center',
              }}
            >
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{row.email}</div>
              <div style={{ color: 'var(--text-soft)' }}>{row.name || '—'}</div>
              <div style={{ color: 'var(--text-soft)', fontSize: 12 }}>{row.source || '—'}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{formatDate(row.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
