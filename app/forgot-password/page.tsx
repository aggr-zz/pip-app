'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PipLogo } from '@/components/ui/PipLogo';
import { Button } from '@/components/ui/Button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/reset-password`,
      });
      if (error) {
        setError('Не удалось отправить письмо. Проверь адрес.');
        return;
      }
      setSent(true);
    });
  }

  return (
    <main className="auth">
      <div className="auth__card">
        <a href="/" className="auth__logo" aria-label="PIP">
          <PipLogo size={48} />
        </a>

        {sent ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📬</div>
            <h1 className="auth__title">Письмо отправлено</h1>
            <p className="auth__sub">
              Мы отправили ссылку для сброса пароля на{' '}
              <strong>{email}</strong>. Проверь почту — письмо придёт в течение минуты.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
              Не нашёл? Проверь папку «Спам». Если письма нет — напиши на{' '}
              <a href="mailto:saymien1@gmail.com" style={{ color: 'var(--color-coral)', fontWeight: 600 }}>saymien1@gmail.com</a>,
              поможем восстановить доступ вручную.
            </p>
            <a href="/login" style={{ display: 'block', marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--color-coral)', fontWeight: 600 }}>
              ← Вернуться ко входу
            </a>
          </>
        ) : (
          <>
            <h1 className="auth__title">Сброс пароля</h1>
            <p className="auth__sub">
              Введи email — пришлём ссылку для создания нового пароля.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <label className="field">
                <span className="field__label">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  disabled={isPending}
                  required
                  className="field__input"
                />
              </label>

              {error && (
                <div className="auth__error" role="alert">{error}</div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isPending || !email}
                style={{ marginTop: 8 }}
              >
                {isPending ? 'Отправляем…' : 'Отправить ссылку'}
              </Button>
            </form>

            <p className="auth__footer">
              Вспомнил пароль? <a href="/login">Войти</a>
            </p>
          </>
        )}
      </div>

      <style>{authStyles}</style>
    </main>
  );
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
    box-sizing: border-box;
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
