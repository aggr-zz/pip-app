'use client';

/**
 * HintBanner — контекстная подсказка с автодисмисом через localStorage.
 *
 * Показывается один раз: после закрытия не появляется снова.
 * Серверный компонент передаёт `show` на основе состояния данных;
 * клиентская логика дополнительно проверяет localStorage.
 */

import { useEffect, useState } from 'react';

type Variant = 'coral' | 'gold' | 'mint' | 'neutral';

const VARIANT_STYLES: Record<Variant, { bg: string; border: string; icon: string; close: string }> = {
  coral:   { bg: 'var(--color-coral-soft)',  border: 'rgba(238,108,77,0.25)', icon: 'var(--color-coral-deep)', close: 'var(--color-coral)' },
  gold:    { bg: 'var(--color-gold-soft)',   border: 'rgba(212,161,46,0.25)', icon: 'var(--color-gold-deep)',  close: 'var(--color-gold-deep)' },
  mint:    { bg: 'var(--color-mint-soft)',   border: 'rgba(72,199,142,0.25)', icon: 'var(--color-mint-deep)',  close: 'var(--color-mint-deep)' },
  neutral: { bg: 'var(--bg-surface)',        border: 'var(--border-soft)',    icon: 'var(--text-soft)',        close: 'var(--text-muted)' },
};

export interface HintBannerProps {
  id: string;           // уникальный ключ для localStorage (формат: "hint-{страница}-{тема}")
  emoji: string;
  title: string;
  body: string;
  variant?: Variant;
  cta?: { label: string; href: string };
  show?: boolean;       // внешнее условие от сервера; если false — не рендерим вообще
}

export function HintBanner({
  id,
  emoji,
  title,
  body,
  variant = 'neutral',
  cta,
  show = true,
}: HintBannerProps) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    try {
      if (!localStorage.getItem(id)) setVisible(true);
    } catch {
      // SSR или приватный режим — игнорируем
    }
  }, [id, show]);

  function dismiss() {
    setLeaving(true);
    setTimeout(() => {
      try { localStorage.setItem(id, '1'); } catch { /* ignore */ }
      setVisible(false);
    }, 250);
  }

  if (!visible) return null;

  const v = VARIANT_STYLES[variant];

  return (
    <>
      <style>{`
        @keyframes hint-slide-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes hint-slide-out {
          from { opacity: 1; transform: translateY(0)    scale(1); }
          to   { opacity: 0; transform: translateY(-6px) scale(0.97); }
        }
      `}</style>
      <div
        role="note"
        style={{
          position: 'relative',
          padding: '14px 16px',
          background: v.bg,
          border: `1px solid ${v.border}`,
          borderRadius: 'var(--radius-xl)',
          animation: `${leaving ? 'hint-slide-out' : 'hint-slide-in'} 0.25s ease both`,
        }}
      >
        {/* Dismiss button */}
        <button
          onClick={dismiss}
          aria-label="Закрыть подсказку"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: v.close,
            padding: 4,
            lineHeight: 1,
            opacity: 0.6,
            fontSize: 16,
          }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', gap: 12, paddingRight: 20 }}>
          {/* Emoji icon */}
          <div style={{
            fontSize: 24,
            lineHeight: 1,
            flexShrink: 0,
            marginTop: 1,
          }}>
            {emoji}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 14,
              color: v.icon,
              marginBottom: 3,
              lineHeight: 1.3,
            }}>
              {title}
            </div>
            <div style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
            }}>
              {body}
            </div>

            {cta && (
              <a
                href={cta.href}
                style={{
                  display: 'inline-block',
                  marginTop: 10,
                  padding: '6px 14px',
                  background: v.icon,
                  color: '#fff',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 12.5,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                {cta.label} →
              </a>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
