'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LandingLoginForm() {
  const router = useRouter();
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(translateError(error.message));
        return;
      }
      router.push('/parent');
      router.refresh();
    });
  }

  async function handleYandex() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'yandex',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/parent`,
      },
    });
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: 20,
      padding: '26px 24px 24px',
      border: '1px solid #F0EBDD',
      boxShadow: '0 4px 24px rgba(27,34,56,.08)',
      maxWidth: 400,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 18 }}>
        <span style={{ fontFamily: 'var(--font-display, "Bricolage Grotesque", sans-serif)', fontWeight: 600, fontSize: 19, color: '#1B2238' }}>
          Войти
        </span>
        <span style={{ fontSize: 13, color: '#6B7290' }}>
          Нет аккаунта?{' '}
          <a href="/signup" style={{ color: '#EE6C4D', fontWeight: 600, textDecoration: 'none' }}>Создать</a>
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <FieldLabel label="Email">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="parent@example.com"
            disabled={isPending}
            required
            style={inputStyle}
          />
        </FieldLabel>

        <FieldLabel label="Пароль">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isPending}
            required
            style={inputStyle}
          />
        </FieldLabel>

        {error && (
          <div style={{
            padding: '9px 13px', borderRadius: 8,
            background: '#FADAD4', color: '#E2533B',
            fontSize: 13, marginBottom: 4,
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          style={{
            width: '100%', marginTop: 12, height: 46, borderRadius: 12,
            background: '#EE6C4D', color: 'white',
            fontFamily: 'inherit', fontWeight: 600, fontSize: 15,
            border: 'none', cursor: isPending ? 'default' : 'pointer',
            opacity: isPending ? 0.7 : 1, transition: 'opacity 0.15s, transform 0.08s',
          }}
        >
          {isPending ? 'Заходим…' : 'Войти →'}
        </button>
      </form>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0', color: '#9CA1B6', fontSize: 12 }}>
        <div style={{ flex: 1, height: 1, background: '#F0EBDD' }} />
        <span>или</span>
        <div style={{ flex: 1, height: 1, background: '#F0EBDD' }} />
      </div>

      <button
        type="button"
        onClick={handleYandex}
        disabled={isPending}
        style={{
          width: '100%', height: 44, borderRadius: 12,
          background: 'white', color: '#1B2238',
          fontFamily: 'inherit', fontWeight: 500, fontSize: 14,
          border: '1px solid #E8E1D0',
          cursor: isPending ? 'default' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'background 0.15s',
        }}
      >
        <YandexIcon />
        Войти через Яндекс
      </button>
    </div>
  );
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <span style={{
        display: 'block', fontSize: 11, fontWeight: 600,
        color: '#6B7290', textTransform: 'uppercase',
        letterSpacing: '.06em', marginBottom: 5,
      }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  background: '#FAF9F5', border: '1px solid #E8E1D0',
  borderRadius: 10, padding: '10px 13px',
  fontFamily: 'inherit', fontSize: 14, color: '#1B2238',
  outline: 'none', transition: 'border-color 0.15s',
};

function translateError(msg: string): string {
  if (msg.includes('Invalid login'))       return 'Неверный email или пароль';
  if (msg.includes('Email not confirmed')) return 'Подтверди email — мы выслали письмо';
  return 'Что-то пошло не так. Попробуй ещё раз.';
}

function YandexIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.4 2H10.6C7.4 2 5 4.4 5 7.5c0 2.4 1.3 4.1 3.6 5L5 22h3l3.4-9h1.2v9h2.8V2h-2zm0 8.8h-1.1c-1.6 0-2.5-1-2.5-2.5 0-1.6.9-2.5 2.5-2.5h1.1v5z"/>
    </svg>
  );
}
