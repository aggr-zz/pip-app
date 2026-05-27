'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

/**
 * Показывает всплывающее уведомление «Задание добавлено»
 * когда в URL есть ?created=1, затем убирает параметр.
 */
export function CreatedToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = searchParams.get('created') === '1';

  useEffect(() => {
    if (!show) return;

    // Убираем ?created=1 из URL сразу (без перезагрузки)
    const params = new URLSearchParams(searchParams.toString());
    params.delete('created');
    const newUrl = params.toString() ? `${pathname}?${params}` : pathname;
    router.replace(newUrl, { scroll: false });

    // Таймер — на случай если захотим скрыть программно (компонент сам unmount-ится через router.replace)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]);

  if (!show) return null;

  return (
    <>
      <style>{`
        @keyframes pip-toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px) scale(0.9); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0)       scale(1); }
        }
        @keyframes pip-toast-out {
          from { opacity: 1; transform: translateX(-50%) translateY(0)       scale(1); }
          to   { opacity: 0; transform: translateX(-50%) translateY(-8px)    scale(0.95); }
        }
      `}</style>
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: 'calc(52px + env(safe-area-inset-top, 0px) + 10px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--color-ink)',
        color: 'white',
        borderRadius: 100,
        padding: '10px 18px 10px 14px',
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: 13.5,
        boxShadow: '0 4px 20px rgba(27,34,56,0.32)',
        whiteSpace: 'nowrap',
        animation: 'pip-toast-in 0.3s cubic-bezier(0.22,1,0.36,1) both, pip-toast-out 0.3s ease 2.5s both',
        pointerEvents: 'none',
      }}
    >
      <span style={{
        width: 22, height: 22, borderRadius: '50%',
        background: 'var(--color-mint)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 13l4 4L19 7" />
        </svg>
      </span>
      Задание добавлено
    </div>
    </>
  );
}
