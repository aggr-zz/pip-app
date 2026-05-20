'use client';

/**
 * PulsingIcon — мигающий / пульсирующий контейнер.
 * Используется для иконки ⚡ на баннере «Задания на подтверждение».
 */
export function PulsingIcon({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @keyframes pip-pulse-icon {
          0%,  100% { transform: scale(1);    filter: brightness(1); }
          40%        { transform: scale(1.25); filter: brightness(1.3); }
          60%        { transform: scale(1.1);  filter: brightness(1.15); }
        }
        @keyframes pip-pulse-ring {
          0%   { box-shadow: 0 0 0 0   rgba(255,255,255,0.5); opacity: 1; }
          100% { box-shadow: 0 0 0 14px rgba(255,255,255,0);   opacity: 0; }
        }
        .pip-pulsing-icon {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          animation: pip-pulse-icon 1.8s ease-in-out infinite;
        }
        .pip-pulsing-icon::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          animation: pip-pulse-ring 1.8s ease-out infinite;
        }
      `}</style>
      <span className="pip-pulsing-icon">{children}</span>
    </>
  );
}
