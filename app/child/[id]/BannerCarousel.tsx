'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { BannerCard } from '@/app/parent/ParentBannerCarousel';

const STORAGE_KEY = 'pip-banner-closed';

type Slide = {
  id: string;
  image: string;
  dark?: boolean;
  title: string;
  body: string;
  href?: string;
  ctaLabel?: string;
};

function makeSlides(childId: string): Slide[] {
  return [
    {
      id: 'ontime',
      image: '/banners/banner-ontime.jpg',
      title: 'Успей вовремя',
      body: 'Задания сбрасываются в полночь — не теряй стрик!',
    },
    {
      id: 'earn',
      image: '/banners/banner-earn.jpg',
      dark: true,
      title: 'Зарабатывай монеты',
      body: 'Сделал дело — получил PIP. Регулярность решает!',
    },
    {
      id: 'shop',
      image: '/banners/banner-shop.jpg',
      title: 'Загляни в магазин',
      body: 'Копи PIP и меняй на крутые награды!',
      href: `/child/${childId}/shop`,
      ctaLabel: 'В магазин',
    },
    {
      id: 'save',
      image: '/banners/banner-save.jpg',
      title: 'Копи на мечту',
      body: 'Откладывай монеты в копилку — цель уже близко.',
    },
    {
      id: 'honesty',
      image: '/banners/banner-honesty.jpg',
      title: 'Родители всё видят',
      body: 'Честность выгоднее — за обман монеты могут списать.',
    },
    {
      id: 'rewards',
      image: '/banners/banner-rewards.jpg',
      title: 'Выбери награду',
      body: 'Игра, пицца, игрушка — что захочешь!',
      href: `/child/${childId}/shop`,
      ctaLabel: 'Выбрать',
    },
    {
      id: 'dream',
      image: '/banners/banner-dream.jpg',
      title: 'Большая мечта',
      body: 'Поставь большую цель и копи на неё шаг за шагом.',
    },
  ];
}

const AUTO_INTERVAL = 4500;

export function BannerCarousel({ childId }: { childId: string }) {
  const slides = makeSlides(childId);
  const [current, setCurrent] = useState(0);
  const [closed, setClosed] = useState(false);
  const touchRef = useRef({ startX: 0, startY: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ВАЖНО: все хуки — ДО любого раннего return (Rules of Hooks).
  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') setClosed(true);
    } catch {}
  }, []);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    if (closed) return;
    timerRef.current = setInterval(next, AUTO_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [next, closed]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(next, AUTO_INTERVAL);
  }, [next]);

  function handleClose() {
    setClosed(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchRef.current.startX;
    const dy = e.changedTouches[0].clientY - touchRef.current.startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) next(); else prev();
    }
    resetTimer();
  }

  if (closed) return null;

  const slide = slides[current];

  return (
    <BannerCard
      slide={slide}
      slides={slides}
      current={current}
      onDot={(i) => { setCurrent(i); resetTimer(); }}
      onClose={handleClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      renderCta={(s) =>
        s.href && s.ctaLabel ? (
          <Link href={s.href} className="bc-cta" onClick={(e) => e.stopPropagation()}>
            {s.ctaLabel} →
          </Link>
        ) : null
      }
    />
  );
}
