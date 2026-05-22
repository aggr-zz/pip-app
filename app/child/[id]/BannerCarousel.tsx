'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'pip-banner-closed';

// ─── Slide definitions ────────────────────────────────────────────────────────

type Slide = {
  id: string;
  gradient: string;
  shadowColor: string;
  illustration: React.ReactNode;
  title: string;
  body: string;
  href?: string;
  ctaLabel?: string;
};

function IllustrationClock() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glow circle */}
      <circle cx="55" cy="58" r="38" fill="rgba(255,255,255,0.15)" />
      {/* Clock body */}
      <circle cx="55" cy="58" r="30" fill="white" fillOpacity="0.22" stroke="white" strokeWidth="3" strokeOpacity="0.6"/>
      {/* Hour hand */}
      <line x1="55" y1="58" x2="55" y2="38" stroke="white" strokeWidth="3.5" strokeLinecap="round"/>
      {/* Minute hand */}
      <line x1="55" y1="58" x2="70" y2="52" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      {/* Center dot */}
      <circle cx="55" cy="58" r="3.5" fill="white"/>
      {/* Tick marks */}
      <line x1="55" y1="30" x2="55" y2="34" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7"/>
      <line x1="55" y1="82" x2="55" y2="86" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7"/>
      <line x1="27" y1="58" x2="31" y2="58" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7"/>
      <line x1="79" y1="58" x2="83" y2="58" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.7"/>
      {/* Bell top */}
      <path d="M48 29 Q55 22 62 29" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeOpacity="0.8"/>
      {/* Deco stars */}
      <text x="14" y="32" fontSize="16" fill="white" fillOpacity="0.7">⭐</text>
      <text x="78" y="24" fontSize="12" fill="white" fillOpacity="0.5">✦</text>
      <text x="18" y="80" fontSize="10" fill="white" fillOpacity="0.4">✦</text>
    </svg>
  );
}

function IllustrationGift() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glow */}
      <circle cx="55" cy="62" r="36" fill="rgba(255,255,255,0.12)" />
      {/* Box body */}
      <rect x="28" y="55" width="54" height="38" rx="4" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="2.5" strokeOpacity="0.7"/>
      {/* Lid */}
      <rect x="24" y="45" width="62" height="14" rx="4" fill="white" fillOpacity="0.35" stroke="white" strokeWidth="2.5" strokeOpacity="0.8"/>
      {/* Ribbon vertical */}
      <rect x="50" y="45" width="10" height="48" rx="2" fill="white" fillOpacity="0.5"/>
      {/* Ribbon horizontal */}
      <rect x="24" y="49" width="62" height="6" rx="2" fill="white" fillOpacity="0.5"/>
      {/* Bow left loop */}
      <path d="M55 44 Q40 30 38 38 Q36 46 55 44Z" fill="white" fillOpacity="0.8"/>
      {/* Bow right loop */}
      <path d="M55 44 Q70 30 72 38 Q74 46 55 44Z" fill="white" fillOpacity="0.8"/>
      {/* Bow center knot */}
      <circle cx="55" cy="44" r="5" fill="white"/>
      {/* Sparkles */}
      <text x="16" y="42" fontSize="14" fill="white" fillOpacity="0.75">✨</text>
      <text x="80" y="36" fontSize="12" fill="white" fillOpacity="0.6">✦</text>
      <text x="84" y="70" fontSize="10" fill="white" fillOpacity="0.5">⭐</text>
    </svg>
  );
}

function IllustrationEye() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glow */}
      <ellipse cx="55" cy="55" rx="40" ry="28" fill="rgba(255,255,255,0.12)" />
      {/* Eye outline */}
      <path d="M15 55 Q55 18 95 55 Q55 92 15 55Z" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="2.5" strokeOpacity="0.8"/>
      {/* Iris */}
      <circle cx="55" cy="55" r="16" fill="white" fillOpacity="0.35" stroke="white" strokeWidth="2" strokeOpacity="0.7"/>
      {/* Pupil */}
      <circle cx="55" cy="55" r="8" fill="white" fillOpacity="0.7"/>
      {/* Highlight */}
      <circle cx="59" cy="51" r="3" fill="white"/>
      {/* Lashes top */}
      <line x1="55" y1="34" x2="55" y2="28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>
      <line x1="40" y1="37" x2="37" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>
      <line x1="70" y1="37" x2="73" y2="32" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.7"/>
      {/* Deco */}
      <text x="16" y="30" fontSize="12" fill="white" fillOpacity="0.6">⚡</text>
      <text x="78" y="28" fontSize="14" fill="white" fillOpacity="0.55">⚡</text>
      <text x="22" y="86" fontSize="10" fill="white" fillOpacity="0.4">✦</text>
    </svg>
  );
}

function IllustrationFire() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glow */}
      <circle cx="55" cy="65" r="32" fill="rgba(255,255,255,0.12)" />
      {/* Flame outer */}
      <path d="M55 20 C55 20 76 42 76 62 C76 74 66 86 55 86 C44 86 34 74 34 62 C34 42 55 20 55 20Z"
        fill="white" fillOpacity="0.3" stroke="white" strokeWidth="2" strokeOpacity="0.6"/>
      {/* Flame inner */}
      <path d="M55 40 C55 40 66 54 66 65 C66 73 61 80 55 80 C49 80 44 73 44 65 C44 54 55 40 55 40Z"
        fill="white" fillOpacity="0.45"/>
      {/* Flame core */}
      <path d="M55 58 C55 58 61 64 61 70 C61 75 58 78 55 78 C52 78 49 75 49 70 C49 64 55 58 55 58Z"
        fill="white" fillOpacity="0.8"/>
      {/* Stars around */}
      <text x="14" y="50" fontSize="16" fill="white" fillOpacity="0.7">⭐</text>
      <text x="80" y="44" fontSize="12" fill="white" fillOpacity="0.6">✦</text>
      <text x="82" y="80" fontSize="10" fill="white" fillOpacity="0.45">⭐</text>
      <text x="18" y="82" fontSize="10" fill="white" fillOpacity="0.4">✦</text>
    </svg>
  );
}

function IllustrationCoin() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Stack shadow */}
      <ellipse cx="58" cy="84" rx="24" ry="6" fill="rgba(0,0,0,0.12)" />
      {/* Coin 3 (back) */}
      <ellipse cx="52" cy="72" rx="22" ry="8" fill="white" fillOpacity="0.25" stroke="white" strokeWidth="1.5" strokeOpacity="0.5"/>
      {/* Coin 2 */}
      <ellipse cx="55" cy="64" rx="22" ry="8" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="1.5" strokeOpacity="0.6"/>
      {/* Coin 1 body */}
      <circle cx="58" cy="52" r="26" fill="white" fillOpacity="0.3" stroke="white" strokeWidth="2.5" strokeOpacity="0.7"/>
      {/* Coin 1 face */}
      <circle cx="58" cy="52" r="20" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="1.5" strokeOpacity="0.5"/>
      {/* PIP text */}
      <text x="47" y="58" fontSize="14" fontWeight="bold" fill="white" fillOpacity="0.9" fontFamily="sans-serif">PIP</text>
      {/* Sparkles */}
      <text x="14" y="38" fontSize="16" fill="white" fillOpacity="0.7">💎</text>
      <text x="82" y="30" fontSize="12" fill="white" fillOpacity="0.6">✦</text>
      <text x="18" y="80" fontSize="10" fill="white" fillOpacity="0.4">⭐</text>
    </svg>
  );
}

// ─── Slides data ──────────────────────────────────────────────────────────────

function makeSlides(childId: string): Slide[] {
  return [
    {
      id: 'deadline',
      gradient: 'linear-gradient(135deg, #FF6B35 0%, #FF9A3C 100%)',
      shadowColor: 'rgba(255, 107, 53, 0.35)',
      illustration: <IllustrationClock />,
      title: 'Успей до конца дня',
      body: 'Задания сбрасываются в полночь — не теряй стрик!',
    },
    {
      id: 'shop',
      gradient: 'linear-gradient(135deg, #6C63FF 0%, #B06AE8 100%)',
      shadowColor: 'rgba(108, 99, 255, 0.35)',
      illustration: <IllustrationGift />,
      title: 'Загляни в магазин',
      body: 'Копи PIP монеты и трать на крутые награды!',
      href: `/child/${childId}/shop`,
      ctaLabel: 'В магазин →',
    },
    {
      id: 'nocheat',
      gradient: 'linear-gradient(135deg, #EE4266 0%, #F77F5A 100%)',
      shadowColor: 'rgba(238, 66, 102, 0.35)',
      illustration: <IllustrationEye />,
      title: 'Не жульничай!',
      body: 'Родители всё видят и могут вычесть монеты. Честность выгоднее!',
    },
    {
      id: 'streak',
      gradient: 'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)',
      shadowColor: 'rgba(247, 151, 30, 0.35)',
      illustration: <IllustrationFire />,
      title: 'Держи стрик!',
      body: 'Каждый день подряд — стрик растёт. Не прерывай цепочку!',
    },
    {
      id: 'earn',
      gradient: 'linear-gradient(135deg, #0BAA72 0%, #38EF7D 100%)',
      shadowColor: 'rgba(11, 170, 114, 0.35)',
      illustration: <IllustrationCoin />,
      title: 'Копи PIP монеты',
      body: 'Регулярность — ключ к большим накоплениям. Не пропускай!',
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

const AUTO_INTERVAL = 4500;
const SWIPE_THRESHOLD = 50;

export function BannerCarousel({ childId }: { childId: string }) {
  const slides = makeSlides(childId);
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [closed, setClosed] = useState(false);

  // Read localStorage after mount
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setClosed(true);
    } catch {}
  }, []);

  function handleClose() {
    setClosed(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }

  if (closed) return null;
  const touchRef = useRef({ startX: 0, startY: 0, axisLocked: false, active: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const goTo = useCallback((idx: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent(idx);
    setTimeout(() => setIsAnimating(false), 350);
  }, [isAnimating]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, slides.length, goTo]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, slides.length, goTo]);

  // Auto-rotate
  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, AUTO_INTERVAL);
  }, [next]);

  useEffect(() => {
    timerRef.current = setInterval(next, AUTO_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next]);

  // Touch swipe
  function handleTouchStart(e: React.TouchEvent) {
    touchRef.current = {
      startX: e.touches[0].clientX,
      startY: e.touches[0].clientY,
      axisLocked: false,
      active: true,
    };
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchRef.current.active) return;
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    touchRef.current.active = false;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      if (dx < 0) next(); else prev();
    }
    resetTimer();
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchRef.current.active) return;
    const dx = e.touches[0].clientX - touchRef.current.startX;
    const dy = e.touches[0].clientY - touchRef.current.startY;
    if (!touchRef.current.axisLocked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      touchRef.current.axisLocked = true;
      if (Math.abs(dy) > Math.abs(dx)) {
        touchRef.current.active = false; // vertical scroll wins
        return;
      }
    }
    if (touchRef.current.axisLocked && Math.abs(dx) > 6) {
      e.preventDefault();
    }
  }

  const slide = slides[current];

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      {/* Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          borderRadius: 0,
          overflow: 'hidden',
          height: 156,
          background: slide.gradient,
          boxShadow: `0 4px 20px ${slide.shadowColor}`,
          display: 'flex',
          alignItems: 'stretch',
          position: 'relative',
          transition: 'background 0.45s ease, box-shadow 0.45s ease',
          cursor: 'pointer',
        }}
      >
        {/* Close button */}
        <button
          aria-label="Закрыть"
          onClick={(e) => { e.stopPropagation(); handleClose(); }}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.18)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            backdropFilter: 'blur(4px)',
            flexShrink: 0,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {/* Decorative circles */}
        <div aria-hidden style={{
          position: 'absolute', top: -30, right: -20,
          width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none',
        }} />
        <div aria-hidden style={{
          position: 'absolute', bottom: -40, right: 40,
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          pointerEvents: 'none',
        }} />

        {/* Left: text */}
        <div style={{
          flex: 1,
          padding: '20px 0 20px 22px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          zIndex: 1,
          minWidth: 0,
        }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 17,
              color: 'white',
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
              marginBottom: 7,
              textShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}>
              {slide.title}
            </div>
            <div style={{
              fontSize: 12.5,
              color: 'rgba(255,255,255,0.88)',
              lineHeight: 1.45,
              maxWidth: 180,
            }}>
              {slide.body}
            </div>
          </div>

          {/* Dots + optional CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Слайд ${i + 1}`}
                  onClick={(e) => { e.stopPropagation(); goTo(i); resetTimer(); }}
                  style={{
                    width: i === current ? 18 : 6,
                    height: 6,
                    borderRadius: 100,
                    background: 'white',
                    opacity: i === current ? 1 : 0.4,
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'width 0.3s ease, opacity 0.3s ease',
                  }}
                />
              ))}
            </div>
            {slide.href && slide.ctaLabel && (
              <Link
                href={slide.href}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'white',
                  background: 'rgba(255,255,255,0.22)',
                  borderRadius: 100,
                  padding: '4px 12px',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                  backdropFilter: 'blur(4px)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {slide.ctaLabel}
              </Link>
            )}
          </div>
        </div>

        {/* Right: illustration */}
        <div style={{
          width: 130,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          position: 'relative',
        }}>
          <div style={{
            transform: 'scale(1.05)',
            filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.18))',
            transition: 'opacity 0.35s ease',
          }}>
            {slide.illustration}
          </div>
        </div>
      </div>
    </div>
  );
}
