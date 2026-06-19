'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { PipLogo } from '@/components/ui/PipLogo';
import { Button } from '@/components/ui/Button';
import { acceptFamilyInvite } from '@/app/invite-family/[token]/inviteActions';

export default function SignupPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [cooldown, setCooldown] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Обратный отсчёт троттлинга повторной отправки письма.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleResend() {
    if (resend === 'sending' || cooldown > 0) return;
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Пароль слишком короткий — минимум 8 символов');
      return;
    }
    if (!agreed) {
      setError('Необходимо принять пользовательское соглашение');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      // Триггер handle_new_user в БД создаёт family + profile родителя автоматически
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // invite_token переживёт подтверждение email: применим его в /auth/confirm,
          // т.к. при включённом подтверждении сессии сразу после signUp нет.
          data: { name, ...(inviteToken ? { invite_token: inviteToken } : {}) },
          // Ссылку в письме строит хук (lib/email/authEmails.ts → /auth/confirm);
          // это значение нужно лишь для прохождения allowlist GoTrue.
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        setError(translateSignupError(error.message));
        return;
      }

      // Если Supabase настроен на email-подтверждение — показываем сообщение
      // и НЕ редиректим. Иначе сессия активна и можно идти на /parent.
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setNeedsConfirm(true);
        return;
      }

      // Если пришли с инвайтом — присоединяем к семье
      if (inviteToken) {
        const joinResult = await acceptFamilyInvite(inviteToken);
        if (!joinResult.ok) {
          // Регистрация прошла, но инвайт не сработал — не критично, просто идём в /parent
          console.warn('[signup] invite accept failed:', joinResult.error);
        }
      }

      router.push('/parent');
      router.refresh();
    });
  }

  if (needsConfirm) {
    return (
      <main className="auth">
        <div className="auth__card auth__card--confirm">
          <div className="auth__icon">📬</div>
          <h1 className="auth__title">Проверь почту</h1>
          <p className="auth__sub">
            Мы отправили письмо на <strong>{email}</strong>. Кликни на ссылку,
            чтобы подтвердить email и зайти. Ссылку можно открыть на любом
            устройстве.
          </p>

          <div style={{ marginTop: 20 }}>
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
                  ? `Отправить ещё раз (${cooldown})`
                  : 'Отправить письмо ещё раз'}
            </Button>

            {resend === 'sent' && (
              <p style={{ fontSize: 13, color: 'var(--color-mint-deep, #0BAA72)', marginTop: 10 }}>
                Готово — письмо отправлено повторно. Проверь почту и папку «Спам».
              </p>
            )}
            {resend === 'error' && (
              <p style={{ fontSize: 13, color: 'var(--status-danger)', marginTop: 10 }}>
                Не удалось отправить. Попробуй чуть позже.
              </p>
            )}

            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 14 }}>
              Уже подтвердил? <a href="/login" style={{ color: 'var(--color-coral)', fontWeight: 600 }}>Войти</a>
            </p>
          </div>
        </div>
        <style>{authStyles}</style>
      </main>
    );
  }

  return (
    <main className="auth">
      <div className="auth__card">
        <a href="/" className="auth__logo" aria-label="PIP">
          <PipLogo size={48} />
        </a>

        <h1 className="auth__title">
          {inviteToken ? 'Войти в семью' : 'Создать семью'}
        </h1>
        <p className="auth__sub">
          {inviteToken
            ? 'Создай аккаунт — и сразу окажешься в семье, куда тебя пригласили.'
            : 'Один email на семью. Детей добавишь после регистрации — каждому задашь PIN, и они смогут входить в свой режим.'}
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
            <span>Ты принимаешь приглашение в семью</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <Field
            label="Как тебя зовут"
            type="text"
            value={name}
            onChange={setName}
            placeholder="Анна"
            disabled={isPending}
          />
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
            placeholder="Минимум 8 символов"
            disabled={isPending}
          />

          {/* Чекбокс принятия соглашения */}
          <label className="auth__agree">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              disabled={isPending}
              className="auth__agree-check"
            />
            <span>
              Я подтверждаю, что мне есть 18 лет, и принимаю{' '}
              <a href="/terms" target="_blank" rel="noopener">условия использования</a>{' '}
              и{' '}
              <a href="/privacy" target="_blank" rel="noopener">политику конфиденциальности</a>
            </span>
          </label>

          {error && <div className="auth__error" role="alert">{error}</div>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isPending || !agreed}
            style={{ marginTop: 8 }}
          >
            {isPending ? 'Создаём…' : 'Зарегистрироваться'}
          </Button>
        </form>

        <p className="auth__footer">
          Уже есть аккаунт? <a href="/login">Войти</a>
        </p>
      </div>

      <style>{authStyles}</style>
    </main>
  );
}

function Field({ label, type, value, onChange, placeholder, disabled }: {
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

function translateSignupError(msg: string): string {
  if (msg.includes('already registered')) return 'Этот email уже зарегистрирован — попробуй войти';
  if (msg.includes('Password')) return 'С паролем что-то не так — попробуй другой';
  if (msg.includes('email')) return 'Email выглядит странно — проверь';
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
    max-width: 440px;
    background: var(--bg-surface);
    border-radius: var(--radius-2xl);
    padding: 40px 36px;
    border: 1px solid var(--border-soft);
    box-shadow: var(--shadow-lg);
  }
  .auth__card--confirm {
    text-align: center;
  }
  .auth__icon {
    font-size: 48px;
    margin-bottom: 16px;
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
  .auth__error {
    background: var(--status-danger-soft);
    color: var(--status-danger);
    padding: 10px 14px;
    border-radius: var(--radius-md);
    font-size: 13.5px;
    margin: 14px 0 4px;
  }
  .auth__agree {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin: 16px 0 4px;
    cursor: pointer;
    font-size: 13px;
    color: var(--text-soft);
    line-height: 1.5;
  }
  .auth__agree-check {
    flex-shrink: 0;
    margin-top: 2px;
    width: 16px;
    height: 16px;
    accent-color: var(--color-coral);
    cursor: pointer;
  }
  .auth__agree a {
    color: var(--text-primary);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .auth__agree a:hover {
    color: var(--color-coral);
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
