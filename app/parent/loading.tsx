// Скелет загрузки родительских экранов — мгновенный отклик при навигации,
// пока серверный компонент тянет данные (без него — пустой/«зависший» экран).
export default function ParentLoading() {
  const bar = (w: string, h = 14) => ({
    width: w,
    height: h,
    borderRadius: 8,
    background: 'rgba(15,19,32,0.07)',
  });
  return (
    <main style={{ minHeight: '100%' }}>
      <header
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-soft)',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <div style={bar('48px', 22)} />
        <div style={bar('64px', 16)} />
      </header>

      <div style={{ padding: '20px 16px', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ ...bar('40%', 22), marginBottom: 18 }} />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-soft)',
              borderRadius: 'var(--radius-lg)',
              padding: 16,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(15,19,32,0.07)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ ...bar('55%'), marginBottom: 8 }} />
              <div style={bar('35%', 11)} />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pip-skeleton { 0%,100%{opacity:1} 50%{opacity:.5} }
        main { animation: pip-skeleton 1.2s ease-in-out infinite; }
      `}</style>
    </main>
  );
}
