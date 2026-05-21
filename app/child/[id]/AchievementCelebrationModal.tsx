'use client';

import { useEffect, useState, useMemo } from 'react';
import { ACHIEVEMENTS, type AchievementType } from '@/lib/achievements';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  type: AchievementType;
  childName: string;
  onClose: () => void;
}

type Sparkle = {
  id: number;
  x: number;
  top: number;
  size: number;
  emoji: string;
  delay: number;
  duration: number;
};

const SPARKLE_EMOJIS = ['✨', '⭐', '💫', '🌟', '✨', '⭐', '💫', '🌟', '🎉', '🏅'];

function seededRand(seed: number, i: number): number {
  const x = Math.sin(seed * 9301 + i * 49297 + 233) * 93847;
  return x - Math.floor(x);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AchievementCelebrationModal({ type, childName, onClose }: Props) {
  const [closing, setClosing] = useState(false);
  const meta = ACHIEVEMENTS[type];

  // Stable seed from achievement type
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < type.length; i++) {
      h = (h * 31 + type.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(h);
  }, [type]);

  const sparkles = useMemo<Sparkle[]>(() =>
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: seededRand(seed, i * 5) * 90 + 5,
      top: seededRand(seed, i * 5 + 1) * 70 + 5,
      size: 14 + seededRand(seed, i * 5 + 2) * 16,
      emoji: SPARKLE_EMOJIS[Math.floor(seededRand(seed, i * 5 + 3) * SPARKLE_EMOJIS.length)],
      delay: seededRand(seed, i * 5 + 4) * 1.8,
      duration: 1.6 + seededRand(seed, i * 5 + 3) * 1.2,
    })),
  [seed]);

  useEffect(() => {
    if (navigator.vibrate) navigator.vibrate([60, 40, 100, 40, 220]);
  }, []);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 300);
  }

  return (
    <>
      <style>{`
        @keyframes ach-overlay-in  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ach-overlay-out { from { opacity: 1; } to { opacity: 0; } }
        @keyframes ach-badge {
          0%   { transform: scale(0) rotate(-18deg); opacity: 0; }
          55%  { transform: scale(1.18) rotate(6deg);  opacity: 1; }
          75%  { transform: scale(0.94) rotate(-2deg); }
          88%  { transform: scale(1.04) rotate(1deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes ach-badge-pulse {
          0%, 100% { box-shadow: 0 0 40px var(--ach-glow), 0 20px 60px rgba(0,0,0,0.5); }
          50%       { box-shadow: 0 0 80px var(--ach-glow), 0 20px 60px rgba(0,0,0,0.5); }
        }
        @keyframes ach-text-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ach-sparkle {
          0%   { opacity: 0;   transform: scale(0) translateY(0px); }
          30%  { opacity: 1;   transform: scale(1) translateY(-8px); }
          70%  { opacity: 0.7; transform: scale(0.9) translateY(-16px); }
          100% { opacity: 0;   transform: scale(0.3) translateY(-28px); }
        }
        @keyframes ach-ring {
          0%   { transform: scale(0.5); opacity: 0.8; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @keyframes ach-label-pop {
          0%   { opacity: 0; transform: translateY(-8px) scale(0.9); }
          100% { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>

      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 300,
          background: 'linear-gradient(180deg, #0d1117 0%, #1a1200 45%, #3d2600 100%)',
          animation: `${closing ? 'ach-overlay-out' : 'ach-overlay-in'} 0.3s ease forwards`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px 56px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Floating sparkles */}
        {sparkles.map((s) => (
          <div
            key={s.id}
            aria-hidden
            style={{
              position: 'fixed',
              left: `${s.x}%`,
              top: `${s.top}%`,
              fontSize: s.size,
              animation: `ach-sparkle ${s.duration}s ${s.delay}s ease-in-out infinite`,
              opacity: 0,
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {s.emoji}
          </div>
        ))}

        {/* Content — stops click propagation so backdrop click works */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Label */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              color: 'rgba(255, 200, 60, 0.85)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 20,
              animation: 'ach-label-pop 0.4s 0.05s ease both',
              opacity: 0,
            }}
          >
            Новое достижение!
          </div>

          {/* Badge */}
          <div
            style={{
              position: 'relative',
              width: 164,
              height: 164,
              flexShrink: 0,
              marginBottom: 32,
            }}
          >
            {/* Pulse rings */}
            {[0, 1].map((i) => (
              <div
                key={i}
                aria-hidden
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: '2px solid rgba(255, 185, 0, 0.5)',
                  animation: `ach-ring 2s ${i * 0.9}s ease-out infinite`,
                }}
              />
            ))}

            {/* Main badge circle */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ffe066 0%, #ffb300 50%, #e67e00 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 72,
                animation: 'ach-badge 0.7s 0.1s cubic-bezier(0.22,1,0.36,1) both, ach-badge-pulse 2.6s 0.9s ease-in-out infinite',
                '--ach-glow': 'rgba(255, 185, 0, 0.7)',
                boxShadow: '0 0 40px rgba(255, 185, 0, 0.7), 0 20px 60px rgba(0,0,0,0.5)',
              } as React.CSSProperties}
            >
              {meta.icon}
            </div>
          </div>

          {/* Title + description */}
          <div
            style={{
              textAlign: 'center',
              animation: 'ach-text-up 0.5s 0.4s ease both',
              opacity: 0,
            }}
          >
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 32,
                color: '#fff',
                margin: 0,
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              {meta.title}
            </h2>
            <p
              style={{
                fontSize: 15,
                color: 'rgba(255,255,255,0.65)',
                margin: '10px 0 0',
                lineHeight: 1.5,
                maxWidth: 280,
              }}
            >
              {meta.description}
            </p>
          </div>

          {/* Child name pill */}
          <div
            style={{
              marginTop: 20,
              padding: '8px 18px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 100,
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              fontWeight: 600,
              animation: 'ach-text-up 0.4s 0.55s ease both',
              opacity: 0,
            }}
          >
            🏆 Молодец, {childName}!
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              marginTop: 32,
              padding: '17px 52px',
              background: 'rgba(255, 220, 100, 0.95)',
              color: '#1a0800',
              border: 'none',
              borderRadius: 20,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 17,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              animation: 'ach-text-up 0.4s 0.65s ease both',
              opacity: 0,
            }}
          >
            Супер! ⭐
          </button>
        </div>
      </div>
    </>
  );
}
