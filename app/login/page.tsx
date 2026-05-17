'use client';

import { useState, useTransition, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PipLogo } from '@/components/ui/PipLogo';
import { Button } from '@/components/ui/Button';

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/parent';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(translateError(error.message));
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <main className="auth">
      <div className="auth__card">
        <a href="/" className="auth__logo" aria-label="pip">
          <PipLogo size={48} />
        </a>

        <h1 className="auth__title">С возвращением</h1>
        <p className="auth__sub">Войди, чтобы посмотреть, как там дети.</p>

        <form onSubmit={handleEmailLogin} noValidate>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="parent@example.com"
            disabled={isPending}
          />
          <Field
            label="Пароль"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            disabled={isPending}
          />

          {error && <div className="auth__error" role="alert">{error}</div>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isPending}
            style={{ marginTop: 8 }}
          >
            {isPending ? 'Заходим…' : 'Войти'}
          </Button>
        </form>

        <div className="auth__divider"><span>или</span></div>

        <Button
          type="button"
          variant="ghost"
          size="lg"
          fullWidth
          onClick={handleGoogleLogin}
          disabled={isPending}
        >
          <GoogleIcon /> Войти через Google
        </Button>

        <p className="auth__footer">
          Нет аккаунта? <a href="/signup">Создать</a>
        </p>
      </div>

      <style>{authStyles}</style>
    </main>
  );
}  // end LoginContent

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        required
        className="field__input"
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44-3.36 0-6.5-2.65-6.5-6.27 0-3.6 2.95-6.27 6.5-6.27 2.75 0 4.4 1.78 4.4 1.78l1.92-1.99S15.65 4 12.18 4C7.34 4 3.6 8.05 3.6 12.95c0 4.8 3.49 9.05 8.66 9.05 4.55 0 7.88-3.11 7.88-7.74 0-.97-.13-1.55-.13-1.55z"
      />
    </svg>
  );
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login')) return 'Неверный email или пароль';
  if (msg.includes('Email not confirmed')) return 'Подтверди email — мы выслали письмо';
  return 'Что-то пошло не так. Попробуй ещё раз.';
}

const authStyles = `
  .auth {
    min-height: 100vh;
    display: grid;
    place-items: center;
    padding: 24px;
  }
  .auth__card {
    width: 100%;
    max-width: 420px;
    background: var(--bg-surface);
    border-radius: var(--radius-2xl);
    padding: 40px 36px;
    border: 1px solid var(--border-soft);
    box-shadow: var(--shadow-lg);
  }
  .auth__logo { display: inline-block; margin-bottom: 28px; }
  .auth__title {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: 32px;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
    line-height: 1.05;
  }
  .auth__sub {
    color: var(--text-soft);
    font-size: 14.5px;
    margin: 0 0 28px;
    line-height: 1.5;
  }
  .field { display: block; margin-bottom: 14px; }
  .field__label {
    display: block;
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-soft);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
  }
  .field__input {
    width: 100%;
    background: var(--bg-surface);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: 12px 14px;
    font-family: inherit;
    font-size: 14.5px;
    color: var(--text-primary);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .field__input:focus {
    outline: none;
    border-color: var(--color-coral);
    box-shadow: 0 0 0 3px var(--color-coral-soft);
  }
  .field__input:disabled {
    background: var(--bg-surface-2);
    color: var(--text-muted);
  }
  .auth__error {
    background: var(--status-danger-soft);
    color: var(--status-danger);
    padding: 10px 14px;
    border-radius: var(--radius-md);
    font-size: 13.5px;
    margin: 14px 0 4px;
  }
  .auth__divider {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 22px 0;
    color: var(--text-muted);
    font-size: 12px;
  }
  .auth__divider::before, .auth__divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-default);
  }
  .auth__footer {
    margin: 24px 0 0;
    font-size: 14px;
    text-align: center;
    color: var(--text-soft);
  }
  .auth__footer a {
    color: var(--color-coral);
    font-weight: 600;
  }
`;
