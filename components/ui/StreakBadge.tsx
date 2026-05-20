'use client';

/**
 * StreakBadge — отображение стрика с тап-тултипом.
 * При нажатии показывает объяснение что такое стрик.
 */

import { useState } from 'react';

interface StreakBadgeProps {
  streak: number;
}

function streakWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

function streakMessage(n: number): string {
  if (n === 0) return 'Выполни задание сегодня — и стрик начнётся!';
  if (n === 1) return 'Отлично, начало положено! Приходи завтра.';
  if (n < 5)   return 'Хорошее начало! Не прерывай серию.';
  if (n < 10)  return 'Крутой стрик! Продолжай в том же духе 💪';
  if (n < 30)  return 'Ты настоящая машина! Редкое достижение.';
  return 'Легенда. Это серьёзно! 🏆';
}

export function StreakBadge({ streak }: StreakBadgeProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Кнопка стрика */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Что такое стрик?"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'inherit',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          color: streak > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)',
        }}
      >
        <span>{streak > 0 ? '🔥' : '💤'}</span>
        <span>
          Стрик {streak} {streakWord(streak)}
        </span>
        <span style={{
          fontSize: 10,
          opacity: 0.55,
          background: 'rgba(255,255,255,0.2)',
          borderRadius: 100,
          width: 16,
          height: 16,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>?</span>
      </button>

      {/* Тултип */}
      {open && (
        <>
          {/* Backdrop для закрытия */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 10 }}
          />
          <div
            role="tooltip"
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              width: 240,
              background: 'var(--color-ink)',
              color: '#fff',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              animation: 'hint-slide-in 0.2s ease both',
            }}
          >
            {/* Стрелочка */}
            <div style={{
              position: 'absolute',
              bottom: -6,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 12,
              height: 6,
              background: 'var(--color-ink)',
              clipPath: 'polygon(0 0, 100% 0, 50% 100%)',
            }} />

            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 5 }}>
              🔥 Что такое стрик?
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.5, opacity: 0.85 }}>
              Стрик — это сколько дней подряд ты выполнял хотя бы одно задание.
              Не пропускай дни — за длинный стрик получишь бейджи и уважение!
            </div>
            <div style={{
              marginTop: 8,
              padding: '6px 10px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 'var(--radius-md)',
              fontSize: 12,
              fontStyle: 'italic',
              opacity: 0.9,
            }}>
              {streakMessage(streak)}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
