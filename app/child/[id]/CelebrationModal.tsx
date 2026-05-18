'use client';

import { useEffect, useMemo, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CelebrationData = {
  childName: string;
  taskTitle: string;
  awarded: number;
  requiresApproval: boolean;
  currentStreak: number;
  availableLeft: number; // tasks remaining after this one
};

type Theme = 'gold' | 'confetti' | 'fire' | 'magic';
type ParticleShape = 'square' | 'circle' | 'rect';

type Particle = {
  id: number;
  x: number;         // % from left
  y: number;         // % from top (start)
  size: number;
  color: string;
  shape: ParticleShape;
  delay: number;     // s
  duration: number;  // s
  driftX: number;    // px
  driftY: number;    // px
  rotation: number;  // deg
};

// ─── Theme Config ─────────────────────────────────────────────────────────────

const THEME = {
  gold: {
    bg: 'linear-gradient(180deg, #16152a 0%, #2a1f00 55%, #a06800 100%)',
    coinGradient: 'linear-gradient(135deg, #ffe066 0%, #ffb300 50%, #e67e00 100%)',
    coinGlow: 'rgba(255, 185, 0, 0.7)',
    particleColors: ['#ffd700', '#ffb300', '#fff7a0', '#ff9500', '#fff0c0', '#ffe066'],
    particleShape: 'square' as ParticleShape,
    particleCount: 18,
    headline: (name: string) => `Молодец, ${name}! 🌟`,
    streakBg: 'rgba(255,255,255,0.12)',
    buttonBg: 'rgba(255,255,255,0.95)',
    buttonColor: '#1a1000',
    accent: '#ffd700',
  },
  confetti: {
    bg: 'linear-gradient(180deg, #090f1e 0%, #0e1f3d 60%, #1a2f5a 100%)',
    coinGradient: 'linear-gradient(135deg, #ffd700 0%, #ff9500 100%)',
    coinGlow: 'rgba(255, 185, 0, 0.6)',
    particleColors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96e6a1', '#ffeaa7', '#fd79a8', '#a29bfe', '#fdcb6e'],
    particleShape: 'rect' as ParticleShape,
    particleCount: 28,
    headline: (name: string) => `Супер, ${name}! 🎉`,
    streakBg: 'rgba(255,255,255,0.12)',
    buttonBg: 'rgba(255,255,255,0.95)',
    buttonColor: '#0a1628',
    accent: '#4ecdc4',
  },
  fire: {
    bg: 'radial-gradient(ellipse at 50% 100%, #7a1e00 0%, #3d0a00 50%, #1a0500 100%)',
    coinGradient: 'linear-gradient(135deg, #ffcc00 0%, #ff6600 50%, #cc2200 100%)',
    coinGlow: 'rgba(255, 100, 0, 0.8)',
    particleColors: ['#ff6b00', '#ff3300', '#ff8c00', '#ffcc00', '#ff4500', '#ff9900'],
    particleShape: 'circle' as ParticleShape,
    particleCount: 20,
    headline: (name: string) => `Огонь, ${name}! 🔥`,
    streakBg: 'rgba(255, 100, 0, 0.2)',
    buttonBg: 'rgba(255,220,150,0.95)',
    buttonColor: '#3d0a00',
    accent: '#ff8c00',
  },
  magic: {
    bg: 'radial-gradient(ellipse at 40% 30%, #2d0d5c 0%, #150828 60%, #080514 100%)',
    coinGradient: 'linear-gradient(135deg, #e040fb 0%, #7c4dff 50%, #00bcd4 100%)',
    coinGlow: 'rgba(168, 85, 247, 0.8)',
    particleColors: ['#e040fb', '#7c4dff', '#00bcd4', '#f06292', '#ffcc02', '#80cbc4', '#ce93d8'],
    particleShape: 'circle' as ParticleShape,
    particleCount: 22,
    headline: (name: string) => `Волшебство, ${name}! ✨`,
    streakBg: 'rgba(168, 85, 247, 0.2)',
    buttonBg: 'rgba(240, 220, 255, 0.95)',
    buttonColor: '#150828',
    accent: '#ce93d8',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickTheme(streak: number, seed: number): Theme {
  if (streak >= 7) return 'fire';
  const pool: Theme[] = ['gold', 'confetti', 'magic', 'gold']; // gold more common
  return pool[seed % pool.length];
}

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed * 9301 + index * 49297 + 233) * 93847;
  return x - Math.floor(x);
}

function generateParticles(theme: Theme, seed: number): Particle[] {
  const cfg = THEME[theme];
  return Array.from({ length: cfg.particleCount }, (_, i) => {
    const r = (offset: number) => seededRandom(seed, i * 7 + offset);
    return {
      id: i,
      x: r(0) * 100,
      y: theme === 'confetti' ? -(r(1) * 40) : (20 + r(1) * 60),
      size: theme === 'confetti'
        ? (6 + r(2) * 10)
        : (4 + r(2) * 14),
      color: cfg.particleColors[Math.floor(r(3) * cfg.particleColors.length)],
      shape: cfg.particleShape,
      delay: r(4) * 1.4,
      duration: theme === 'confetti' ? (2.5 + r(5) * 2) : (1.5 + r(5) * 2),
      driftX: (r(6) - 0.5) * 160,
      driftY: theme === 'confetti' ? (80 + r(7) * 120) : -(60 + r(7) * 120),
      rotation: r(8) * 720 - 360,
    };
  });
}

function streakWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CelebrationModal({
  data,
  onClose,
}: {
  data: CelebrationData;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // Stable seed from child name + task title (same task always same theme)
  const seed = useMemo(() => {
    let h = 0;
    for (let i = 0; i < data.taskTitle.length; i++) {
      h = (h * 31 + data.taskTitle.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(h);
  }, [data.taskTitle]);

  const theme = useMemo(() => pickTheme(data.currentStreak, seed), [data.currentStreak, seed]);
  const cfg = THEME[theme];
  const particles = useMemo(() => generateParticles(theme, seed), [theme, seed]);

  useEffect(() => {
    // tiny delay for entrance animation
    const t = requestAnimationFrame(() => setVisible(true));
    // vibrate on celebration (mobile)
    if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
    return () => cancelAnimationFrame(t);
  }, []);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 300);
  }

  const particleAnimation = {
    gold: 'cel-particle-scatter',
    confetti: 'cel-confetti-fall',
    fire: 'cel-ember-rise',
    magic: 'cel-particle-scatter',
  }[theme];

  const tasksLeftText =
    data.availableLeft <= 0
      ? 'Все задания на сегодня выполнены! 🎊'
      : data.availableLeft === 1
      ? 'Осталось 1 задание на сегодня'
      : `Осталось ${data.availableLeft} ${tasksLeftWord(data.availableLeft)} на сегодня`;

  return (
    <>
      <style>{`
        @keyframes cel-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cel-overlay-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes cel-card-in {
          0%   { opacity: 0; transform: translateY(40px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes cel-card-out {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(20px) scale(0.97); }
        }
        @keyframes cel-coin-bounce {
          0%   { opacity: 0; transform: translateY(-60px) scale(0.4) rotate(-8deg); }
          55%  { opacity: 1; transform: translateY(8px)   scale(1.07) rotate(3deg); }
          75%  { transform: translateY(-4px) scale(0.97) rotate(-1deg); }
          100% { opacity: 1; transform: translateY(0)    scale(1) rotate(0deg); }
        }
        @keyframes cel-coin-pulse {
          0%, 100% { box-shadow: 0 0 32px var(--cel-glow), 0 12px 40px rgba(0,0,0,0.4); }
          50%       { box-shadow: 0 0 60px var(--cel-glow), 0 12px 40px rgba(0,0,0,0.4); }
        }
        @keyframes cel-text-up {
          0%   { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes cel-particle-scatter {
          0%   { opacity: 0; transform: translate(0,0) rotate(0deg) scale(0); }
          15%  { opacity: 1; transform: translate(calc(var(--pdx)*0.4), calc(var(--pdy)*0.4)) scale(1) rotate(120deg); }
          100% { opacity: 0; transform: translate(var(--pdx), var(--pdy)) rotate(var(--prot)) scale(0.4); }
        }
        @keyframes cel-confetti-fall {
          0%   { opacity: 1; transform: translateY(var(--pstart)) rotate(var(--prot)) scaleX(1); }
          80%  { opacity: 0.7; }
          100% { opacity: 0;   transform: translateY(calc(var(--pstart) + var(--pdy) * 1px)) rotate(calc(var(--prot) + 400deg)) scaleX(-1); }
        }
        @keyframes cel-ember-rise {
          0%   { opacity: 0.9; transform: translateY(0) translateX(0) scale(1); }
          100% { opacity: 0;   transform: translateY(var(--pdy)) translateX(calc(var(--pdx) * 0.3px)) scale(0.2); }
        }
        @keyframes cel-streak-pop {
          0%   { opacity: 0; transform: scale(0.85) translateY(8px); }
          100% { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>

      {/* Overlay backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
          background: cfg.bg,
          animation: `${closing ? 'cel-overlay-out' : 'cel-overlay-in'} 0.3s ease forwards`,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            style={{
              position: 'fixed',
              left: `${p.x}%`,
              top: theme === 'confetti' ? `${p.y}%` : `${p.y}%`,
              width: p.shape === 'rect' ? p.size * 0.5 : p.size,
              height: p.size,
              background: p.color,
              borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'rect' ? '2px' : '2px',
              opacity: 0,
              pointerEvents: 'none',
              '--pdx': `${p.driftX}px`,
              '--pdy': `${p.driftY}px`,
              '--prot': `${p.rotation}deg`,
              '--pstart': theme === 'confetti' ? `${p.y * 0.8}%` : '0px',
              animation: `${particleAnimation} ${p.duration}s ${p.delay}s ease-out both`,
              boxShadow: (theme === 'fire' || theme === 'magic')
                ? `0 0 ${p.size * 2}px ${p.color}`
                : 'none',
            } as React.CSSProperties}
          />
        ))}

        {/* Content card */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            zIndex: 1,
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px 48px',
            animation: `${closing ? 'cel-card-out' : 'cel-card-in'} 0.4s 0.05s cubic-bezier(0.22,1,0.36,1) both`,
          }}
        >
          {/* Coin */}
          <div
            style={{
              width: 148,
              height: 148,
              borderRadius: '50%',
              background: cfg.coinGradient,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'cel-coin-bounce 0.6s 0.1s cubic-bezier(0.22,1,0.36,1) both, cel-coin-pulse 2.4s 0.8s ease-in-out infinite',
              '--cel-glow': cfg.coinGlow,
              boxShadow: `0 0 40px ${cfg.coinGlow}, 0 16px 48px rgba(0,0,0,0.5)`,
              marginBottom: 32,
              flexShrink: 0,
            } as React.CSSProperties}
          >
            {data.requiresApproval ? (
              <>
                <div style={{ fontSize: 36, lineHeight: 1 }}>⏳</div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.9)',
                  marginTop: 4,
                }}>
                  проверка
                </div>
              </>
            ) : (
              <>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: data.awarded >= 100 ? 30 : 38,
                  color: '#fff',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}>
                  +{data.awarded}
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 14,
                  color: 'rgba(255,255,255,0.85)',
                  marginTop: 2,
                }}>
                  pip
                </div>
              </>
            )}
          </div>

          {/* Headline */}
          <div style={{
            animation: 'cel-text-up 0.5s 0.3s ease both',
            textAlign: 'center',
          }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 30,
              color: '#fff',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
            }}>
              {cfg.headline(data.childName)}
            </h2>
            <p style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.72)',
              margin: '10px 0 0',
              lineHeight: 1.45,
              maxWidth: 300,
            }}>
              {data.requiresApproval
                ? `Задание «${data.taskTitle}» отправлено на подтверждение`
                : `Задание «${data.taskTitle}» выполнено!`}
            </p>
          </div>

          {/* Streak card */}
          {data.currentStreak > 0 && (
            <div style={{
              marginTop: 24,
              padding: '14px 20px',
              background: cfg.streakBg,
              border: `1px solid rgba(255,255,255,0.15)`,
              borderRadius: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              animation: 'cel-streak-pop 0.4s 0.5s ease both',
              opacity: 0,
              minWidth: 220,
            }}>
              <span style={{ fontSize: 24 }}>🔥</span>
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 700,
                  fontSize: 15,
                  color: '#fff',
                }}>
                  Стрик {data.currentStreak} {streakWord(data.currentStreak)}
                  {data.currentStreak >= 7 ? ' 🏆' : data.currentStreak >= 3 ? ' 💪' : ''}
                </div>
                <div style={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                  marginTop: 2,
                }}>
                  {data.currentStreak >= 7
                    ? 'Неделя без пропусков!'
                    : data.currentStreak >= 3
                    ? 'Так держать!'
                    : 'Продолжай!'}
                </div>
              </div>
            </div>
          )}

          {/* Дальше button */}
          <button
            onClick={handleClose}
            style={{
              marginTop: 32,
              width: '100%',
              maxWidth: 320,
              padding: '17px 24px',
              background: cfg.buttonBg,
              color: cfg.buttonColor,
              border: 'none',
              borderRadius: 20,
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 17,
              cursor: 'pointer',
              animation: 'cel-text-up 0.4s 0.6s ease both',
              opacity: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Дальше
          </button>

          {/* Tasks left */}
          <div style={{
            marginTop: 14,
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
            animation: 'cel-text-up 0.4s 0.7s ease both',
            opacity: 0,
            textAlign: 'center',
          }}>
            {tasksLeftText}
          </div>
        </div>
      </div>
    </>
  );
}

function tasksLeftWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'задание';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'задания';
  return 'заданий';
}
