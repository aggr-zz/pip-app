import Link from 'next/link';

export default function NotFound() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      textAlign: 'center',
      background: 'var(--bg-page)',
    }}>

      {/* Монетка с лицом */}
      <div style={{ marginBottom: 32 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <style>{`
            @keyframes coin-wobble {
              0%   { transform: rotate(-8deg); }
              50%  { transform: rotate(8deg); }
              100% { transform: rotate(-8deg); }
            }
            @keyframes coin-float {
              0%   { transform: translateY(0px); }
              50%  { transform: translateY(-10px); }
              100% { transform: translateY(0px); }
            }
            @keyframes sweat-drop {
              0%, 60%  { opacity: 0; transform: translateY(0); }
              70%      { opacity: 1; transform: translateY(0); }
              100%     { opacity: 0; transform: translateY(12px); }
            }
            .coin-group {
              animation: coin-float 3s ease-in-out infinite;
              transform-origin: 60px 60px;
            }
            .coin-face {
              animation: coin-wobble 2.5s ease-in-out infinite;
              transform-origin: 60px 60px;
            }
            .sweat { animation: sweat-drop 2.5s ease-in-out infinite; }
          `}</style>

          <g className="coin-group">
            {/* Тень */}
            <ellipse cx="60" cy="112" rx="28" ry="6" fill="rgba(0,0,0,0.08)" />

            <g className="coin-face">
              {/* Монета — основа */}
              <circle cx="60" cy="60" r="48" fill="url(#coinGrad)" />
              {/* Блик */}
              <ellipse cx="46" cy="42" rx="12" ry="8" fill="rgba(255,255,255,0.35)" transform="rotate(-20 46 42)" />
              {/* Обводка */}
              <circle cx="60" cy="60" r="48" stroke="#D4A12E" strokeWidth="3" fill="none" opacity="0.5" />
              {/* Внутренний круг */}
              <circle cx="60" cy="60" r="40" stroke="#D4A12E" strokeWidth="1.5" fill="none" opacity="0.3" />

              {/* Глаза — растерянные, смотрят в разные стороны */}
              {/* Левый глаз */}
              <ellipse cx="46" cy="54" rx="6" ry="7" fill="white" />
              <ellipse cx="44" cy="55" rx="3.5" ry="4" fill="#1B2238" />
              <circle cx="43" cy="54" r="1.2" fill="white" />

              {/* Правый глаз */}
              <ellipse cx="74" cy="54" rx="6" ry="7" fill="white" />
              <ellipse cx="76" cy="55" rx="3.5" ry="4" fill="#1B2238" />
              <circle cx="75" cy="54" r="1.2" fill="white" />

              {/* Брови — домиком (растерянность) */}
              <path d="M40 46 Q46 42 52 46" stroke="#D4A12E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <path d="M68 46 Q74 42 80 46" stroke="#D4A12E" strokeWidth="2.5" strokeLinecap="round" fill="none" />

              {/* Рот — кривой */}
              <path d="M50 72 Q56 68 70 72" stroke="#8B5E0A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            </g>

            {/* Капля пота */}
            <g className="sweat">
              <circle cx="84" cy="36" r="4" fill="#93C5FD" opacity="0.8" />
              <path d="M84 40 Q81 46 84 50 Q87 46 84 40Z" fill="#93C5FD" opacity="0.8" />
            </g>
          </g>

          <defs>
            <radialGradient id="coinGrad" cx="38%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#FFEDB0" />
              <stop offset="45%" stopColor="#F2C14E" />
              <stop offset="100%" stopColor="#D4A12E" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      {/* Текст */}
      <div style={{
        fontSize: 96,
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        color: 'var(--color-coral)',
        marginBottom: 8,
      }}>
        404
      </div>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 22,
        letterSpacing: '-0.015em',
        margin: '0 0 12px',
        color: 'var(--text-primary)',
      }}>
        Страница потерялась
      </h1>

      <p style={{
        fontSize: 15,
        color: 'var(--text-soft)',
        lineHeight: 1.6,
        maxWidth: 300,
        margin: '0 0 32px',
      }}>
        Мы тоже не знаем, где она. Зато знаем, где главная.
      </p>

      <Link
        href="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '13px 28px',
          background: 'var(--color-coral)',
          color: 'white',
          borderRadius: 100,
          fontWeight: 600,
          fontSize: 15,
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(238,108,77,0.35)',
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
      >
        На главную
      </Link>

      <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
        Или <Link href="/login" style={{ color: 'var(--color-coral)', fontWeight: 500 }}>войди в аккаунт</Link>, если уже зарегистрирован
      </p>
    </main>
  );
}
