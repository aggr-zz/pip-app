'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'pip-parent-banner-closed';

type Slide = {
  id: string;
  gradient: string;
  illustration: React.ReactNode;
  title: string;
  body: string;
  href?: string;
  ctaLabel?: string;
};

function IllustrationCamera() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      <circle cx="55" cy="60" r="36" fill="rgba(255,255,255,0.12)" />
      {/* Camera body */}
      <rect x="22" y="44" width="66" height="46" rx="8" fill="white" fillOpacity="0.22" stroke="white" strokeWidth="2.5" strokeOpacity="0.7"/>
      {/* Lens */}
      <circle cx="55" cy="67" r="16" fill="white" fillOpacity="0.18" stroke="white" strokeWidth="2.5" strokeOpacity="0.8"/>
      <circle cx="55" cy="67" r="9" fill="white" fillOpacity="0.25"/>
      {/* Viewfinder bump */}
      <rect x="40" y="36" width="30" height="12" rx="4" fill="white" fillOpacity="0.35" stroke="white" strokeWidth="2" strokeOpacity="0.7"/>
      {/* Flash dot */}
      <circle cx="79" cy="52" r="4" fill="white" fillOpacity="0.6"/>
      <text x="8" y="28" fontSize="14" fill="white" fillOpacity="0.7">📸</text>
      <text x="78" y="22" fontSize="10" fill="white" fillOpacity="0.5">✦</text>
    </svg>
  );
}

function IllustrationTarget() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      <circle cx="55" cy="58" r="36" fill="rgba(255,255,255,0.12)" />
      <circle cx="55" cy="58" r="30" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.5"/>
      <circle cx="55" cy="58" r="20" fill="none" stroke="white" strokeWidth="2.5" strokeOpacity="0.65"/>
      <circle cx="55" cy="58" r="10" fill="white" fillOpacity="0.35" stroke="white" strokeWidth="2.5" strokeOpacity="0.8"/>
      {/* Arrow */}
      <line x1="78" y1="32" x2="58" y2="56" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <path d="M72 28 L82 28 L82 38" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
      <text x="10" y="30" fontSize="12" fill="white" fillOpacity="0.6">🎯</text>
      <text x="78" y="88" fontSize="10" fill="white" fillOpacity="0.4">✦</text>
    </svg>
  );
}

function IllustrationLightning() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      <circle cx="55" cy="58" r="36" fill="rgba(255,255,255,0.12)" />
      {/* Lightning bolt */}
      <path d="M62 25 L40 60 L54 60 L48 90 L75 52 L60 52 Z"
        fill="white" fillOpacity="0.35" stroke="white" strokeWidth="2" strokeOpacity="0.8" strokeLinejoin="round"/>
      {/* Glow dots */}
      <circle cx="32" cy="48" r="4" fill="white" fillOpacity="0.3"/>
      <circle cx="78" cy="68" r="3" fill="white" fillOpacity="0.25"/>
      <text x="8" y="32" fontSize="14" fill="white" fillOpacity="0.7">⚡</text>
      <text x="80" y="28" fontSize="10" fill="white" fillOpacity="0.4">✦</text>
    </svg>
  );
}

function IllustrationGift() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      <circle cx="55" cy="62" r="36" fill="rgba(255,255,255,0.12)" />
      <rect x="28" y="55" width="54" height="36" rx="4" fill="white" fillOpacity="0.22" stroke="white" strokeWidth="2.5" strokeOpacity="0.7"/>
      <rect x="24" y="44" width="62" height="14" rx="4" fill="white" fillOpacity="0.32" stroke="white" strokeWidth="2.5" strokeOpacity="0.8"/>
      <rect x="50" y="44" width="10" height="47" rx="2" fill="white" fillOpacity="0.45"/>
      {/* Bow */}
      <path d="M55 44 Q44 36 44 28 Q44 22 52 22 Q58 22 55 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeOpacity="0.8"/>
      <path d="M55 44 Q66 36 66 28 Q66 22 58 22 Q52 22 55 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" strokeOpacity="0.8"/>
      <text x="8" y="28" fontSize="14" fill="white" fillOpacity="0.7">🎁</text>
      <text x="78" y="92" fontSize="10" fill="white" fillOpacity="0.4">✦</text>
    </svg>
  );
}

function IllustrationCalendar() {
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" fill="none">
      <circle cx="55" cy="60" r="36" fill="rgba(255,255,255,0.12)" />
      <rect x="22" y="36" width="66" height="54" rx="8" fill="white" fillOpacity="0.2" stroke="white" strokeWidth="2.5" strokeOpacity="0.7"/>
      {/* Header bar */}
      <rect x="22" y="36" width="66" height="18" rx="8" fill="white" fillOpacity="0.3"/>
      {/* Pin left */}
      <rect x="35" y="28" width="8" height="16" rx="4" fill="white" fillOpacity="0.7"/>
      {/* Pin right */}
      <rect x="67" y="28" width="8" height="16" rx="4" fill="white" fillOpacity="0.7"/>
      {/* Grid dots */}
      {[36,48,60,72].map(x => [60,72,82].map(y => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="3.5" fill="white" fillOpacity="0.4"/>
      )))}
      {/* Checkmark on first */}
      <path d="M33 62 l3 3 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="78" y="26" fontSize="12" fill="white" fillOpacity="0.5">✦</text>
    </svg>
  );
}

const SLIDES: Slide[] = [
  {
    id: 'photo',
    gradient: 'linear-gradient(135deg, #EE6C4D 0%, #D85535 100%)',
    illustration: <IllustrationCamera />,
    title: 'Задания с фото',
    body: 'Включи «Требует фото» — ребёнок загрузит доказательство. Больше никаких «я уже сделал»!',
    href: '/parent/tasks/new',
    ctaLabel: 'Создать задание',
  },
  {
    id: 'goals',
    gradient: 'linear-gradient(135deg, #5B85C9 0%, #3D6BC4 100%)',
    illustration: <IllustrationTarget />,
    title: 'Ставьте цели вместе',
    body: 'Обсудите с ребёнком, на что он хочет копить PIP. Когда цель его — мотивация в разы выше.',
    href: '/parent/rewards/new',
    ctaLabel: 'Добавить награду',
  },
  {
    id: 'approve',
    gradient: 'linear-gradient(135deg, #D4A12E 0%, #B88C20 100%)',
    illustration: <IllustrationLightning />,
    title: 'Подтверждай быстро',
    body: 'Ребёнок ждёт! Быстрое подтверждение поддерживает энтузиазм и помогает сохранить стрик.',
    href: '/parent/approvals',
    ctaLabel: 'К заданиям',
  },
  {
    id: 'rewards',
    gradient: 'linear-gradient(135deg, #E27396 0%, #C45A80 100%)',
    illustration: <IllustrationGift />,
    title: 'Придумай крутую награду',
    body: 'Поход в кино, особое блюдо, час игры — маленькие мечты работают лучше денег.',
    href: '/parent/rewards/new',
    ctaLabel: 'Добавить',
  },
  {
    id: 'habits',
    gradient: 'linear-gradient(135deg, #5BA890 0%, #3D8C76 100%)',
    illustration: <IllustrationCalendar />,
    title: 'Ежедневные привычки',
    body: 'Создай повторяющиеся задания — чистка зубов, уборка, помощь — и PIP сам считает серию.',
    href: '/parent/tasks/new',
    ctaLabel: 'Создать',
  },
];

export function ParentBannerCarousel() {
  const [closed, setClosed] = useState(false);
  const [current, setCurrent] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchRef = useRef({ startX: 0, startY: 0, locked: false });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setClosed(true);
    } catch { /* */ }
  }, []);

  const next = useCallback(() => setCurrent((c) => (c + 1) % SLIDES.length), []);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (closed) return;
    timerRef.current = setInterval(next, 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [closed, next]);

  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, 4500);
  }

  function handleClose() {
    setClosed(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch { /* */ }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, locked: false };
    setIsSwiping(true);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    setIsSwiping(false);
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    const dy = e.changedTouches[0].clientY - touchRef.current.startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) next(); else prev();
      resetTimer();
    }
  }

  if (closed) return null;

  const slide = SLIDES[current];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 0,
        userSelect: 'none',
      }}
    >
      <div
        style={{
          background: slide.gradient,
          padding: '20px 16px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          minHeight: 130,
          transition: isSwiping ? 'none' : 'background 0.4s ease',
        }}
      >
        {/* Illustration */}
        <div style={{ flexShrink: 0, width: 88, display: 'flex', justifyContent: 'center' }}>
          {slide.illustration}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              color: 'white',
              letterSpacing: '-0.01em',
              marginBottom: 5,
              lineHeight: 1.2,
            }}
          >
            {slide.title}
          </div>
          <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.88)', lineHeight: 1.45, marginBottom: 10 }}>
            {slide.body}
          </div>
          {slide.href && slide.ctaLabel && (
            <a
              href={slide.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'rgba(255,255,255,0.25)',
                borderRadius: 100,
                padding: '5px 12px',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                textDecoration: 'none',
                backdropFilter: 'blur(4px)',
              }}
            >
              {slide.ctaLabel} →
            </a>
          )}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="Закрыть"
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          width: 26,
          height: 26,
          borderRadius: '50%',
          background: 'rgba(0,0,0,0.2)',
          border: 'none',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: 14,
          lineHeight: 1,
          zIndex: 10,
        }}
      >
        ✕
      </button>

      {/* Dots */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 14,
          display: 'flex',
          gap: 5,
        }}
      >
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); resetTimer(); }}
            style={{
              width: i === current ? 16 : 6,
              height: 6,
              borderRadius: 100,
              background: i === current ? 'white' : 'rgba(255,255,255,0.4)',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'width 0.25s ease, background 0.25s ease',
            }}
          />
        ))}
      </div>
    </div>
  );
}
