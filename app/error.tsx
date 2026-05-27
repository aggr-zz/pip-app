'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PIP error]', error);
  }, [error]);

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

      {/* Монетка с испуганным лицом */}
      <div style={{ marginBottom: 32 }}>
        <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <style>{`
            @keyframes error-shake {
              0%,100% { transform: translateX(0) rotate(0deg); }
              15%      { transform: translateX(-6px) rotate(-5deg); }
              30%      { transform: translateX(6px) rotate(5deg); }
              45%      { transform: translateX(-4px) rotate(-3deg); }
              60%      { transform: translateX(4px) rotate(3deg); }
              75%      { transform: translateX(-2px) rotate(-1deg); }
            }
            @keyframes eye-blink {
              0%,90%,100% { transform: scaleY(1); }
              95%          { transform: scaleY(0.1); }
            }
            .shake-group {
              animation: error-shake 2.5s ease-in-out infinite;
              transform-origin: 60px 60px;
            }
            .eye-l { transform-origin: 46px 54px; animation: eye-blink 3s infinite; }
            .eye-r { transform-origin: 74px 54px; animation: eye-blink 3s 0.1s infinite; }
          `}</style>

          {/* Тень */}
          <ellipse cx="60" cy="112" rx="26" ry="5" fill="rgba(0,0,0,0.08)" />

          <g className="shake-group">
            {/* Монета */}
            <circle cx="60" cy="60" r="48" fill="url(#errCoinGrad)" />
            <ellipse cx="46" cy="42" rx="12" ry="8" fill="rgba(255,255,255,0.3)" transform="rotate(-20 46 42)" />
            <circle cx="60" cy="60" r="48" stroke="#D4A12E" strokeWidth="3" fill="none" opacity="0.4" />

            {/* Глаза — большие, испуганные */}
            <g className="eye-l">
              <ellipse cx="46" cy="54" rx="8" ry="9" fill="white" />
              <ellipse cx="46" cy="55" rx="4.5" ry="5" fill="#1B2238" />
              <circle cx="44" cy="53" r="1.5" fill="white" />
            </g>
            <g className="eye-r">
              <ellipse cx="74" cy="54" rx="8" ry="9" fill="white" />
              <ellipse cx="74" cy="55" rx="4.5" ry="5" fill="#1B2238" />
              <circle cx="72" cy="53" r="1.5" fill="white" />
            </g>

            {/* Брови — сведены в панике */}
            <path d="M38 44 Q46 48 52 43" stroke="#D4A12E" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M68 43 Q74 48 82 44" stroke="#D4A12E" strokeWidth="2.5" strokeLinecap="round" fill="none" />

            {/* Рот — открытый О */}
            <ellipse cx="60" cy="74" rx="8" ry="7" fill="#8B5E0A" />
            <ellipse cx="60" cy="74" rx="5" ry="4.5" fill="#5C3A08" />

            {/* Молния — на лбу */}
            <path d="M58 28 L54 40 L60 38 L56 52" stroke="#EE6C4D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </g>

          <defs>
            <radialGradient id="errCoinGrad" cx="38%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#FFEDB0" />
              <stop offset="45%" stopColor="#F2C14E" />
              <stop offset="100%" stopColor="#D4A12E" />
            </radialGradient>
          </defs>
        </svg>
      </div>

      <div style={{
        fontSize: 80,
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        color: 'var(--color-coral)',
        marginBottom: 8,
      }}>
        ой
      </div>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 600,
        fontSize: 22,
        letterSpacing: '-0.015em',
        margin: '0 0 12px',
        color: 'var(--text-primary)',
      }}>
        Что-то пошло не так
      </h1>

      <p style={{
        fontSize: 15,
        color: 'var(--text-soft)',
        lineHeight: 1.6,
        maxWidth: 300,
        margin: '0 0 32px',
      }}>
        Монетка испугалась и упала. Попробуй ещё раз — обычно помогает.
      </p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
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
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(238,108,77,0.35)',
          }}
        >
          Попробовать снова
        </button>

        <a
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '13px 28px',
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            borderRadius: 100,
            fontWeight: 600,
            fontSize: 15,
            textDecoration: 'none',
            border: '1px solid var(--border-default)',
          }}
        >
          На главную
        </a>
      </div>

      {error.digest && (
        <p style={{ marginTop: 28, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          #{error.digest}
        </p>
      )}
    </main>
  );
}
