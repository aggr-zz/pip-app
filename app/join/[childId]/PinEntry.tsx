'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { joinAsChild } from './actions';

interface PinEntryProps {
  childId: string;
  childName: string;
}

export function PinEntry({ childId, childName }: PinEntryProps) {
  const router    = useRouter();
  const [pin,     setPin]     = useState('');
  const [error,   setError]   = useState<string | null>(null);
  const [focused, setFocused] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Фокусируем поле при монтировании (показывает клавиатуру на мобильных)
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (isPending) return;
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    setError(null);
    if (value.length === 4) submit(value);
  }

  function submit(code: string) {
    startTransition(async () => {
      const result = await joinAsChild({ childId, pin: code });
      if (!result.ok) {
        setError(result.error);
        setPin('');
        setTimeout(() => inputRef.current?.focus(), 50);
        return;
      }
      router.push(`/child/${result.childId}`);
      router.refresh();
    });
  }

  function focusInput() {
    inputRef.current?.focus();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <p style={{
        fontSize: 15, color: 'var(--text-soft)',
        margin: '0 0 32px', textAlign: 'center',
      }}>
        Введи свой PIN
      </p>

      {/* Скрытый нативный инпут — вызывает системную клавиатуру */}
      <input
        ref={inputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="one-time-code"
        maxLength={4}
        value={pin}
        onChange={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={isPending}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
          border: 'none',
          outline: 'none',
        }}
      />

      {/* Точки — нажатие фокусирует инпут */}
      <div
        onClick={focusInput}
        style={{
          display: 'flex', gap: 20, marginBottom: 28,
          cursor: 'pointer', padding: '12px 24px',
          touchAction: 'manipulation',
        }}
      >
        {[0,1,2,3].map((i) => (
          <div
            key={i}
            style={{
              width: 20, height: 20,
              borderRadius: '50%',
              background: i < pin.length
                ? 'var(--color-ink)'
                : 'var(--border-default)',
              transition: 'background 0.15s, transform 0.1s',
              transform: i < pin.length ? 'scale(1.15)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Ошибка */}
      {error && (
        <div style={{
          padding: '10px 18px', borderRadius: 'var(--radius-md)',
          background: 'var(--status-danger-soft)', color: 'var(--status-danger)',
          fontSize: 13.5, marginBottom: 20, textAlign: 'center',
          animation: 'shake 0.3s ease',
        }}>
          {error}
        </div>
      )}

      {/* Кнопка-подсказка открыть клавиатуру */}
      <button
        type="button"
        onClick={focusInput}
        disabled={isPending}
        style={{
          width: '100%', maxWidth: 280,
          padding: '18px 24px',
          background: focused ? 'var(--color-ink)' : 'var(--bg-surface)',
          border: `2px solid ${focused ? 'var(--color-ink)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-xl)',
          color: focused ? 'white' : 'var(--text-soft)',
          fontFamily: 'var(--font-display)',
          fontWeight: 600,
          fontSize: 16,
          cursor: isPending ? 'wait' : 'pointer',
          transition: 'background 0.15s, border-color 0.15s, color 0.15s',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {isPending
          ? '⏳ Проверяю…'
          : focused
            ? '⌨️ Вводи цифры'
            : '👆 Нажми и введи PIN'}
      </button>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%       { transform: translateX(-8px); }
          40%       { transform: translateX(8px); }
          60%       { transform: translateX(-6px); }
          80%       { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
