'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY = 'pip-parent-banner-closed';

type Slide = {
  id: string;
  image: string;
  dark?: boolean; // тёмный текст (для светлых баннеров)
  title: string;
  body: string;
  href?: string;
  ctaLabel?: string;
};

// Баннеры: иллюстрация «вшита» в картинку справа, текст — в пустой левой части.
const SLIDES: Slide[] = [
  {
    id: 'photo',
    image: '/banners/banner-photo.jpg',
    title: 'Задания с фото',
    body: 'Включи «Нужно фото» — ребёнок пришлёт доказательство.',
    href: '/parent/tasks/new',
    ctaLabel: 'Создать задание',
  },
  {
    id: 'habits',
    image: '/banners/banner-habits.jpg',
    title: 'Ежедневные привычки',
    body: 'Повторяющиеся дела — и PIP сам считает серию.',
    href: '/parent/tasks/new',
    ctaLabel: 'Создать',
  },
  {
    id: 'fast',
    image: '/banners/banner-fast.jpg',
    dark: true,
    title: 'Подтверждай быстро',
    body: 'Ребёнок ждёт! Быстрый ответ держит мотивацию.',
    href: '/parent/approvals',
    ctaLabel: 'К подтверждениям',
  },
  {
    id: 'dream',
    image: '/banners/banner-dream.jpg',
    title: 'Ставьте цели вместе',
    body: 'Когда цель — его, мотивация в разы выше.',
    href: '/parent/rewards/new',
    ctaLabel: 'Добавить награду',
  },
  {
    id: 'rewards',
    image: '/banners/banner-rewards.jpg',
    title: 'Награды как мечта',
    body: 'Кино, игра, пицца — работают лучше денег.',
    href: '/parent/rewards/new',
    ctaLabel: 'Добавить',
  },
  {
    id: 'save',
    image: '/banners/banner-save.jpg',
    title: 'Цель-копилка',
    body: 'Ребёнок копит на награду и видит прогресс.',
    href: '/parent/rewards/new',
    ctaLabel: 'Создать цель',
  },
  {
    id: 'honesty',
    image: '/banners/banner-honesty.jpg',
    title: 'Всё под контролем',
    body: 'Подтверждение, история, баланс — каждый шаг виден вам.',
  },
];

export function ParentBannerCarousel() {
  const [closed, setClosed] = useState(false);
  const [current, setCurrent] = useState(0);
  const touchRef = useRef({ startX: 0, startY: 0 });
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
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
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
    <BannerCard
      slide={slide}
      slides={SLIDES}
      current={current}
      onDot={(i) => { setCurrent(i); resetTimer(); }}
      onClose={handleClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      renderCta={(s) =>
        s.href && s.ctaLabel ? (
          <a href={s.href} className="bc-cta" onClick={(e) => e.stopPropagation()}>
            {s.ctaLabel} →
          </a>
        ) : null
      }
    />
  );
}

// ─── Общая карточка баннера ───────────────────────────────────────────────────

export function BannerCard({
  slide, slides, current, onDot, onClose, onTouchStart, onTouchEnd, renderCta,
}: {
  slide: Slide;
  slides: Slide[];
  current: number;
  onDot: (i: number) => void;
  onClose: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  renderCta: (s: Slide) => React.ReactNode;
}) {
  const titleColor = slide.dark ? '#3A2A12' : '#FFFFFF';
  const bodyColor = slide.dark ? 'rgba(58,42,18,0.82)' : 'rgba(255,255,255,0.92)';
  const scrim = slide.dark
    ? 'linear-gradient(90deg, rgba(255,255,255,0.45), rgba(255,255,255,0.12) 42%, transparent 62%)'
    : 'linear-gradient(90deg, rgba(0,0,0,0.30), rgba(0,0,0,0.08) 44%, transparent 64%)';
  const textShadow = slide.dark ? 'none' : '0 1px 4px rgba(0,0,0,0.28)';

  return (
    <div style={{ position: 'relative', userSelect: 'none' }}>
      <div
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1080 / 369',
          minHeight: 116,
          overflow: 'hidden',
          backgroundImage: `url(${slide.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center right',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Скрим для читаемости текста слева */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: scrim, pointerEvents: 'none' }} />

        {/* Текст слева */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: '60%',
          padding: '0 8px 0 18px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6,
          zIndex: 1,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
            lineHeight: 1.18, letterSpacing: '-0.01em', color: titleColor, textShadow,
          }}>
            {slide.title}
          </div>
          <div style={{
            fontSize: 12, lineHeight: 1.4, color: bodyColor, textShadow,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {slide.body}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <div style={{ display: 'flex', gap: 5 }}>
              {slides.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Слайд ${i + 1}`}
                  onClick={(e) => { e.stopPropagation(); onDot(i); }}
                  style={{
                    width: i === current ? 16 : 6, height: 6, borderRadius: 100,
                    background: slide.dark ? '#7A5A28' : '#fff',
                    opacity: i === current ? 1 : 0.4, border: 'none', padding: 0, cursor: 'pointer',
                    transition: 'width 0.25s ease, opacity 0.25s ease',
                  }}
                />
              ))}
            </div>
            {renderCta(slide)}
          </div>
        </div>

        {/* Закрыть */}
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          aria-label="Закрыть"
          style={{
            position: 'absolute', top: 10, right: 10, zIndex: 10,
            width: 26, height: 26, borderRadius: '50%',
            background: 'rgba(0,0,0,0.22)', border: 'none', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', backdropFilter: 'blur(4px)',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <style>{`
        .bc-cta {
          display: inline-flex; align-items: center; white-space: nowrap;
          background: ${slide.dark ? 'rgba(58,42,18,0.14)' : 'rgba(255,255,255,0.25)'};
          color: ${slide.dark ? '#3A2A12' : '#fff'};
          border-radius: 100px; padding: 4px 12px; font-size: 12px; font-weight: 700;
          text-decoration: none; backdrop-filter: blur(4px);
        }
      `}</style>
    </div>
  );
}
