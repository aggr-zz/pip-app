'use client';

import { useEffect, useState } from 'react';

/**
 * Загрузочный сплеш-экран с постером (public/splash.jpg).
 *
 * Показывается при ХОЛОДНОМ открытии приложения (первая загрузка / обновление
 * страницы / запуск установленного PWA или приложения из RuStore). На переходы
 * внутри приложения (next/link) не влияет — корневой layout не перемонтируется.
 *
 * Надёжность: исчезает по CSS-анимации (forwards) даже без JS; JS только
 * размонтирует узел после анимации. reduced-motion — короче.
 */
export function Splash() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGone(true), 1600);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div aria-hidden="true" className="pip-splash">
      <style>{`
        .pip-splash {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #F1E2C4 url('/splash.jpg') center center / cover no-repeat;
          animation: pipSplashOut 1.6s ease forwards;
        }
        @keyframes pipSplashOut {
          0%, 65% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; pointer-events: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pip-splash { animation-duration: 0.9s; }
        }
      `}</style>
    </div>
  );
}
