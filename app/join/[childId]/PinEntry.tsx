'use client';

import { useState } from 'react';

interface PinEntryProps {
  childId: string;
  childName: string;
}

export function PinEntry({ childId, childName }: PinEntryProps) {
  const [pin,       setPin]       = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleDigit(d: string) {
    if (pin.length >= 4 || isPending) return;
    const next = pin + d;
    setPin(next);
    setError(null);
    if (next.length === 4) await submit(next);
  }

  function handleDelete() {
    if (isPending) return;
    setPin((p) => p.slice(0, -1));
    setError(null);
  }

  async function submit(code: string) {
    setIsPending(true);
    try {
      const res = await fetch('/api/auth/child-pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ childId, pin: code }),
        redirect: 'follow',
      });

      if (res.ok || res.redirected) {
        // API route вернул редирект — переходим на URL из ответа
        window.location.href = res.url || `/child/${childId}`;
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Что-то пошло не так');
      setPin('');
    } catch {
      setError('Нет соединения');
      setPin('');
    } finally {
      setIsPending(false);
    }
  }

  const DIGITS = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
      <p style={{ fontSize: 15, color: 'var(--text-soft)', margin: '0 0 28px', textAlign: 'center' }}>
        Введи свой PIN
      </p>

      {/* Точки */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 32 }}>
        {[0,1,2,3].map((i) => (
          <div
            key={i}
            style={{
              width: 18, height: 18,
              borderRadius: '50%',
              background: i < pin.length ? 'var(--color-ink)' : 'var(--border-default)',
              transition: 'background 0.15s',
              transform: i < pin.length ? 'scale(1.1)' : 'scale(1)',
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

      {/* Клавиатура */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%', maxWidth: 300 }}>
        {DIGITS.map((d, i) => {
          if (d === '') return <div key={i} />;
          const isDelete   = d === '⌫';
          const isDisabled = isPending || (!isDelete && pin.length >= 4);

          return (
            <div
              key={i}
              role="button"
              aria-label={isDelete ? 'Удалить' : d}
              aria-disabled={isDisabled}
              onTouchStart={(e) => {
                e.preventDefault();
                if (isDisabled) return;
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.94)';
                if (isDelete) handleDelete();
                else handleDigit(d);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
              }}
              onClick={() => {
                if (isDisabled) return;
                if (isDelete) handleDelete();
                else handleDigit(d);
              }}
              onMouseDown={(e) => {
                if (!isDisabled) (e.currentTarget as HTMLDivElement).style.transform = 'scale(0.94)';
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
              }}
              style={{
                height: 68,
                borderRadius: 'var(--radius-xl)',
                background: isDelete ? 'transparent' : 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-display)',
                fontWeight: isDelete ? 400 : 600,
                fontSize: isDelete ? 22 : 26,
                boxShadow: isDelete ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
                transition: 'transform 0.08s',
                opacity: isDisabled && !isDelete ? 0.4 : 1,
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                cursor: isDisabled ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPending && d === '⌫' ? '…' : d}
            </div>
          );
        })}
      </div>

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
