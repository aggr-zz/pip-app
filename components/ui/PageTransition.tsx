'use client';

/**
 * PageTransition — анимированные переходы между страницами.
 *
 * Работает в двух слоях:
 *   1. Native View Transitions API (CSS) — Chrome 111+, Safari 18+
 *      Управляется через globals.css: ::view-transition-new/old
 *   2. JS-класс на div с key={animKey} — для всех браузеров, fallback + enhancement
 *
 * Логика направления:
 *   - вход в /child/* → слайд снизу (открытие иммерсивного режима)
 *   - выход из /child/* → fade (закрытие)
 *   - глубже по иерархии → слайд справа (iOS push)
 *   - назад по иерархии → слайд слева (iOS pop)
 *   - lateral (та же глубина) → fade-scale
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type AnimClass =
  | ''
  | 'page-enter-right'
  | 'page-enter-left'
  | 'page-enter-up'
  | 'page-enter-fade';

function routeDepth(path: string): number {
  return path.split('/').filter(Boolean).length;
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prevRef   = useRef<string | null>(null);
  const [animKey,   setAnimKey]   = useState(0);
  const [animClass, setAnimClass] = useState<AnimClass>('');

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = pathname;

    // First render — no animation
    if (prev === null || prev === pathname) return;

    const prevDepth  = routeDepth(prev);
    const nextDepth  = routeDepth(pathname);
    const toChild    = pathname.startsWith('/child/');
    const fromChild  = prev.startsWith('/child/');

    let cls: AnimClass;

    if (!fromChild && toChild) {
      // Entering child immersive mode
      cls = 'page-enter-up';
    } else if (fromChild && !toChild) {
      // Leaving child mode back to parent
      cls = 'page-enter-fade';
    } else if (nextDepth > prevDepth) {
      // Drilling deeper (push forward)
      cls = 'page-enter-right';
    } else if (nextDepth < prevDepth) {
      // Going back (pop)
      cls = 'page-enter-left';
    } else {
      // Same depth, different section
      cls = 'page-enter-fade';
    }

    setAnimClass(cls);
    setAnimKey((k) => k + 1);
  }, [pathname]);

  return (
    <div
      key={animKey}
      className={animClass}
      style={{ minHeight: '100dvh', isolation: 'isolate' }}
    >
      {children}
    </div>
  );
}
