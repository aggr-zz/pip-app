// Скелет загрузки детских экранов — мгновенный отклик при навигации.
export default function ChildLoading() {
  return (
    <main style={{ minHeight: '100%', padding: '20px 16px' }}>
      <div
        style={{
          height: 156,
          borderRadius: 0,
          background: 'rgba(15,19,32,0.07)',
          marginBottom: 20,
        }}
      />
      <div
        style={{
          width: '45%',
          height: 22,
          borderRadius: 8,
          background: 'rgba(15,19,32,0.07)',
          marginBottom: 16,
        }}
      />
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: 'var(--radius-lg)',
            padding: 13,
            marginBottom: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(15,19,32,0.07)', flexShrink: 0 }} />
          <div style={{ flex: 1, height: 15, borderRadius: 8, background: 'rgba(15,19,32,0.07)' }} />
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(15,19,32,0.07)', flexShrink: 0 }} />
        </div>
      ))}

      <style>{`
        @keyframes pip-skeleton { 0%,100%{opacity:1} 50%{opacity:.5} }
        main { animation: pip-skeleton 1.2s ease-in-out infinite; }
      `}</style>
    </main>
  );
}
