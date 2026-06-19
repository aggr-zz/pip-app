'use client';

import { useState, useTransition, useEffect, Suspense } from 'react';
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
  const inviteToken = searchParams.get('invite');
  // Если есть инвайт — после логина идём обратно на страницу принятия инвайта
  const next = inviteToken
    ? `/invite-family/${encodeURIComponent(inviteToken)}`
    : searchParams.get('next') || '/parent';

  // Колбэк подтверждения/сброса мог завершиться ошибкой и привести сюда.
  const errorParam = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    errorParam
      ? 'Ссылка устарела или уже использована. Войди или запроси письмо ещё раз.'
      : null
  );
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsConfirm(false);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Email not confirmed')) setNeedsConfirm(true);
        setError(translateError(error.message));
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  async function handleResend() {
    if (!email || resend === 'sending' || cooldown > 0) return;
    setResend('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) {
      setResend('error');
      return;
    }
    setResend('sent');
    setCooldown(60);
  }

  async function handleYandexLogin() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'yandex',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
  }

  return (
    <main className="auth">
      <div className="auth__card">
        <a href="/" className="auth__logo" aria-label="PIP">
          <PipLogo size={48} />
        </a>

        <h1 className="auth__title">С возвращением</h1>
        <p className="auth__sub">
          {inviteToken
            ? 'Войди в аккаунт, чтобы принять приглашение в семью.'
            : 'Войди, чтобы посмотреть, как там дети.'}
        </p>

        {inviteToken && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'rgba(255,183,77,0.12)',
              border: '1px solid rgba(255,183,77,0.4)',
              borderRadius: 'var(--radius-md)',
              marginBottom: 20,
              fontSize: 13,
              color: 'var(--text-primary)',
            }}
          >
            <span style={{ fontSize: 18 }}>👨‍👩‍👧</span>
            <span>После входа ты окажешься в приглашённой семье</span>
          </div>
        )}

        <form onSubmit={handleEmailLogin} noValidate>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="parent@example.com"
            disabled={isPending}
          />
          <div style={{ position: 'relative' }}>
            <Field
              label="Пароль"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              disabled={isPending}
            />
            <a
              href="/forgot-password"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                fontSize: 12,
                color: 'var(--color-coral)',
                fontWeight: 500,
                lineHeight: '18px',
              }}
            >
              Забыл пароль?
            </a>
          </div>

          {error && <div className="auth__error" role="alert">{error}</div>}

          {needsConfirm && (
            <div style={{ marginTop: 10 }}>
              <Button
                type="button"
                variant="ghost"
                size="md"
                fullWidth
                onClick={handleResend}
                disabled={resend === 'sending' || cooldown > 0}
              >
                {resend === 'sending'
                  ? 'Отправляем…'
                  : cooldown > 0
                    ? `Отправить письмо ещё раз (${cooldown})`
                    : 'Отправить письмо подтверждения ещё раз'}
              </Button>
              {resend === 'sent' && (
                <p style={{ fontSize: 13, color: 'var(--color-mint-deep, #0BAA72)', marginTop: 8 }}>
                  Письмо отправлено повторно. Проверь почту и папку «Спам».
                </p>
              )}
              {resend === 'error' && (
                <p style={{ fontSize: 13, color: 'var(--status-danger)', marginTop: 8 }}>
                  Не удалось отправить. Попробуй чуть позже.
                </p>
              )}
            </div>
          )}

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
          onClick={handleYandexLogin}
          disabled={isPending}
        >
          <YandexIcon /> Войти через Яндекс
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

function YandexIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.4 2H10.6C7.4 2 5 4.4 5 7.5c0 2.4 1.3 4.1 3.6 5L5 22h3l3.4-9h1.2v9h2.8V2h-2zm0 8.8h-1.1c-1.6 0-2.5-1-2.5-2.5 0-1.6.9-2.5 2.5-2.5h1.1v5z"/>
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
