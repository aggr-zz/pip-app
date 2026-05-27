'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { PipLogo } from '@/components/ui/PipLogo';
import { Button } from '@/components/ui/Button';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Пароль должен быть не менее 8 символов');
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError('Не удалось сменить пароль. Попробуй запросить ссылку заново.');
        return;
      }
      // Пароль обновлён — идём на главную
      router.push('/parent');
      router.refresh();
    });
  }

  const isValid = password.length >= 8 && confirm === password;

  return (
    <main className="auth">
      <div className="auth__card">
        <a href="/" className="auth__logo" aria-label="PIP">
          <PipLogo size={48} />
        </a>

        <h1 className="auth__title">Новый пароль</h1>
        <p className="auth__sub">Придумай надёжный пароль — минимум 8 символов.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span className="field__label">Новый пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isPending}
              required
              className="field__input"
            />
          </label>

          <label className="field">
            <span className="field__label">Повтори пароль</span>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              disabled={isPending}
              required
              className="field__input"
            />
          </label>

          {confirm && confirm !== password && (
            <div className="auth__hint">Пароли не совпадают</div>
          )}

          {error && (
            <div className="auth__error" role="alert">{error}</div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isPending || !isValid}
            style={{ marginTop: 8 }}
          >
            {isPending ? 'Сохраняем…' : 'Сохранить пароль'}
          </Button>
        </form>
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
  .auth__hint {
    font-size: 13px;
    color: var(--status-danger);
    margin: -6px 0 10px;
  }
  .auth__error {
    background: var(--status-danger-soft);
    color: var(--status-danger);
    padding: 10px 14px;
    border-radius: var(--radius-md);
    font-size: 13.5px;
    margin: 14px 0 4px;
  }
`;
