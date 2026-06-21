'use client';

import { useRef } from 'react';

const SHOTS = [
  { src: '/landing/g1.jpg', icon: '✅', label: 'Задания и баланс' },
  { src: '/landing/g2.jpg', icon: '🔥', label: 'Стрики каждый день' },
  { src: '/landing/g3.jpg', icon: '🎁', label: 'Магазин наград' },
  { src: '/landing/g4.jpg', icon: '🏆', label: 'Профиль и достижения' },
  { src: '/landing/g5.jpg', icon: '👨‍👩‍👧‍👦', label: 'Вся семья вместе' },
];

export function LandingGallery() {
  const ref = useRef<HTMLDivElement>(null);
  const by = (d: number) => ref.current?.scrollBy({ left: d, behavior: 'smooth' });

  return (
    <section id="how" className="lp-sec-cream">
      <div className="lp-wrap">
        <div className="lp-gal-head">
          <div>
            <div className="lp-eyebrow">01 · Внутри приложения</div>
            <h2 className="lp-h2">Реальные экраны, понятные и ребёнку, и родителю</h2>
            <p className="lp-lead">Задания и баланс, стрики, магазин наград и достижения — всё на одном понятном языке.</p>
          </div>
          <div className="lp-gal-btns">
            <button type="button" aria-label="Назад" className="lp-gal-btn" onClick={() => by(-322)}>←</button>
            <button type="button" aria-label="Вперёд" className="lp-gal-btn lp-gal-btn--gold" onClick={() => by(322)}>→</button>
          </div>
        </div>

        <div className="gallery-scroll lp-gal" ref={ref}>
          {SHOTS.map((s) => (
            <div className="lp-gal-item" key={s.src}>
              <div className="lp-gal-card">
                <img src={s.src} alt={s.label} loading="lazy" />
              </div>
              <div className="lp-gal-label">
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span>{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
