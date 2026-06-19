'use client';

import { useEffect, useState } from 'react';

/**
 * Загрузочный сплеш-экран с постером (public/splash.jpg) + короткий прелоадер
 * (спиннер «Загрузка…»), чтобы читалось как загрузка приложения.
 *
 * Показывается при ХОЛОДНОМ открытии (первая загрузка / обновление / запуск
 * установленного PWA или приложения из RuStore). На in-app навигацию не влияет.
 * Исчезает по CSS-анимации даже без JS; JS только размонтирует узел.
 */
export function Splash() {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    // Показываем сплеш только один раз за сессию (первое открытие). На переходах
    // между экранами (в т.ч. полные перезагрузки <a href>) — пропускаем.
    let seen = false;
    try {
      seen = !!sessionStorage.getItem('pip-splash-seen');
      sessionStorage.setItem('pip-splash-seen', '1');
    } catch {}

    if (seen) {
      setGone(true);
      return;
    }
    const t = setTimeout(() => setGone(true), 1700);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;

  return (
    <div aria-hidden="true" className="pip-splash">
      <div className="pip-splash__loader">
        <div className="pip-splash__spin" />
        <div className="pip-splash__txt">Загрузка…</div>
      </div>
      <style>{`
        .pip-splash {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: #F1E2C4 url('/splash.jpg') center center / cover no-repeat;
          animation: pipSplashOut 1.7s ease forwards;
        }
        .pip-splash__loader {
          position: absolute;
          left: 0; right: 0; bottom: 13%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          animation: pipLoaderIn .45s ease both .15s;
        }
        .pip-splash__spin {
          width: 34px; height: 34px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,.55);
          border-top-color: #EE6C4D;
          box-shadow: 0 2px 10px rgba(0,0,0,.18);
          animation: pipSpin .8s linear infinite;
        }
        .pip-splash__txt {
          font: 500 14px/1 var(--font-body, system-ui), sans-serif;
          color: #fff;
          letter-spacing: .02em;
          text-shadow: 0 1px 6px rgba(0,0,0,.45);
        }
        @keyframes pipSpin { to { transform: rotate(360deg); } }
        @keyframes pipLoaderIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes pipSplashOut {
          0%, 68% { opacity: 1; }
          100% { opacity: 0; visibility: hidden; pointer-events: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pip-splash { animation-duration: 1s; }
          .pip-splash__spin { animation-duration: 1.2s; }
        }
      `}</style>
    </div>
  );
}
