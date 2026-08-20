'use client';

import { useState, useTransition, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { acceptFamilyInvite } from '@/app/invite-family/[token]/inviteActions';

/**
 * Единый экран входа PIP (по hi-fi дизайну «Экран входа Pipup.ru»).
 *
 * Один экран, два режима через сегмент-контрол:
 *  • Родитель — вход (email+пароль) / регистрация (имя+email+пароль+повтор+согласие).
 *  • Ребёнок — вход по QR/ссылке-приглашению → переход на /join/[childId] (ввод PIN).
 *
 * Тёплая «золотая» палитра экрана задана прямо тут (отдельная от прохладной
 * дизайн-системы приложения). Шрифты — текущие проектные (Bricolage Grotesque
 * как «Baloo 2» для заголовков/кнопок, Geist как «Nunito» для текста/полей).
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#F4E6CD' }} />}>
      <LoginEntry />
    </Suspense>
  );
}

type Mode = 'parent' | 'child';
type AuthView = 'login' | 'register';

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Текст ошибки по коду из ?error= (после редиректов колбэков). */
function mapErrorParam(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case 'yandex_account_exists':
      return 'Аккаунт с этой почтой уже зарегистрирован по email и паролю. Войдите этим способом.';
    case 'yandex_denied':
      return 'Вход через Яндекс отменён.';
    case 'yandex_state':
    case 'yandex_token':
    case 'yandex_info':
    case 'yandex_noemail':
    case 'yandex_create':
    case 'yandex_link':
    case 'yandex_verify':
    case 'yandex_not_configured':
      return 'Не удалось войти через Яндекс. Попробуйте ещё раз или войдите по email.';
    default:
      return 'Ссылка устарела или уже использована. Войди или запроси письмо ещё раз.';
  }
}

function LoginEntry() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const inviteToken = searchParams.get('invite');
  const next = inviteToken
    ? `/invite-family/${encodeURIComponent(inviteToken)}`
    : searchParams.get('next') || '/parent';
  const errorParam = searchParams.get('error');

  const [mode, setMode] = useState<Mode>(searchParams.get('role') === 'child' ? 'child' : 'parent');
  const [authView, setAuthView] = useState<AuthView>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );

  // Поля формы родителя
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState<string | null>(mapErrorParam(errorParam));
  const [isPending, startTransition] = useTransition();

  // Подтверждение email
  const [loginNeedsConfirm, setLoginNeedsConfirm] = useState(false);
  const [registerSent, setRegisterSent] = useState(false);
  const [resend, setResend] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [cooldown, setCooldown] = useState(0);

  // Вкладка «Ребёнок»
  const [childOpen, setChildOpen] = useState(false); // оверлей входа по QR/ссылке
  const [childLink, setChildLink] = useState('');
  const [childError, setChildError] = useState<string | null>(null);

  const overlayRef = useRef<HTMLDivElement | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  const pwMatch = confirm.length > 0 && confirm === password;
  const pwMismatch = confirm.length > 0 && confirm !== password;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Оверлей: Esc-закрытие, перевод фокуса внутрь, возврат фокуса при закрытии.
  useEffect(() => {
    if (childOpen) {
      lastFocusRef.current = (document.activeElement as HTMLElement) ?? null;
      const id = setTimeout(() => overlayRef.current?.focus(), 30);
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setChildOpen(false); };
      window.addEventListener('keydown', onKey);
      return () => { clearTimeout(id); window.removeEventListener('keydown', onKey); };
    }
    lastFocusRef.current?.focus?.();
  }, [childOpen]);

  // Ловушка фокуса внутри оверлея (aria-modal обязывает не выпускать Tab наружу).
  function trapTab(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const root = overlayRef.current;
    if (!root) return;
    const els = Array.from(
      root.querySelectorAll<HTMLElement>('input,button,a[href],[tabindex]:not([tabindex="-1"])')
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function resetMessages() {
    setError(null);
    setLoginNeedsConfirm(false);
    setResend('idle');
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes('Email not confirmed')) setLoginNeedsConfirm(true);
        setError(translateLoginError(error.message));
        return;
      }
      router.push(next);
      router.refresh();
    });
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) return setError('Пароль слишком короткий — минимум 8 символов');
    if (confirm !== password) return setError('Пароли не совпадают');
    if (!agreed) return setError('Нужно принять условия и подтвердить, что тебе есть 18 лет');

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, ...(inviteToken ? { invite_token: inviteToken } : {}) },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        setError(translateSignupError(error.message));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setRegisterSent(true);
        return;
      }

      if (inviteToken) {
        const joinResult = await acceptFamilyInvite(inviteToken);
        if (!joinResult.ok) console.warn('[login] invite accept failed:', joinResult.error);
      }

      router.push('/parent');
      router.refresh();
    });
  }

  async function handleResend() {
    if (!email || resend === 'sending' || cooldown > 0) return;
    setResend('sending');
    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) { setResend('error'); return; }
    setResend('sent');
    setCooldown(60);
  }

  function handleChildSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChildError(null);
    // Берём именно сегмент после /join/, с фолбэком на голый UUID.
    const pathMatch = childLink.match(/\/join\/([0-9a-f-]{36})/i);
    const id = pathMatch ? pathMatch[1] : childLink.match(UUID_RE)?.[0];
    if (!id) {
      setChildError('Не похоже на ссылку входа. Скопируй её целиком из приложения родителя.');
      return;
    }
    router.push(`/join/${id}`);
  }

  // ── Панель «Проверь почту» (после регистрации с подтверждением) ──────────────
  if (registerSent) {
    return (
      <div className="lg-screen">
        <div className="lg">
          <img className="lg-poster" src="/login-poster.jpg" alt="" aria-hidden="true" />
          <div className="lg-sheet">
            <div className="lg-fade" />
            <div className="lg-grabber" />
            <div style={{ textAlign: 'center', padding: '6px 2px 4px' }}>
              <div style={{ fontSize: 46, marginBottom: 10 }}>📬</div>
              <h1 className="lg-h1">Проверь почту</h1>
              <p className="lg-p" style={{ marginBottom: 22 }}>
                Мы отправили письмо на <strong style={{ color: '#3B2C1A' }}>{email}</strong>.
                Открой ссылку из письма, чтобы подтвердить email и зайти — можно с любого устройства.
              </p>
              <button
                type="button"
                className="lg-secondary"
                onClick={handleResend}
                disabled={resend === 'sending' || cooldown > 0}
                style={{ opacity: resend === 'sending' || cooldown > 0 ? 0.6 : 1 }}
              >
                {resend === 'sending'
                  ? 'Отправляем…'
                  : cooldown > 0
                    ? `Отправить ещё раз (${cooldown})`
                    : 'Отправить письмо ещё раз'}
              </button>
              {resend === 'sent' && <p className="lg-ok" style={{ marginTop: 10 }}>Готово — проверь почту и папку «Спам».</p>}
              {resend === 'error' && <p className="lg-err" style={{ marginTop: 10 }}>Не удалось отправить. Попробуй позже.</p>}
              <p className="lg-switch" style={{ marginTop: 16 }}>
                Уже подтвердил?{' '}
                <button type="button" className="lg-link" onClick={() => { setRegisterSent(false); setAuthView('login'); }}>
                  Войти
                </button>
              </p>
            </div>
          </div>
        </div>
        <ScreenStyles />
      </div>
    );
  }

  return (
    <div className="lg-screen">
      <div className="lg" aria-hidden={childOpen || undefined}>
        <img className="lg-poster" src="/login-poster.jpg" alt="PIP — полезные привычки у детей копятся, как монетки" />

        <div className="lg-sheet">
          <div className="lg-fade" />
          <div className="lg-grabber" />

          <h1 className="lg-sronly">Вход в PIP</h1>

          {/* Сегмент-контрол */}
          <div className="lg-seg" role="radiogroup" aria-label="Кто входит">
            <div className="lg-seg-slider" style={{ transform: mode === 'child' ? 'translateX(calc(100% + 8px))' : 'translateX(0)' }} />
            <button
              type="button" role="radio" aria-checked={mode === 'parent'}
              className={`lg-seg-btn ${mode === 'parent' ? 'is-active' : ''}`}
              onClick={() => { setMode('parent'); resetMessages(); }}
            >
              Родитель
            </button>
            <button
              type="button" role="radio" aria-checked={mode === 'child'}
              className={`lg-seg-btn ${mode === 'child' ? 'is-active' : ''}`}
              onClick={() => { setMode('child'); resetMessages(); }}
            >
              Ребёнок
            </button>
          </div>

          {inviteToken && mode === 'parent' && (
            <div className="lg-invite">
              <span style={{ fontSize: 17 }}>👨‍👩‍👧</span>
              <span>После входа ты окажешься в приглашённой семье</span>
            </div>
          )}

          {/* ── Родитель ─────────────────────────────────────────────── */}
          {mode === 'parent' && (
            <>
            <form className="lg-form" onSubmit={authView === 'login' ? handleLogin : handleRegister} noValidate key={authView}>
              {authView === 'register' && (
                <Field label="Как тебя зовут" htmlFor="lg-name">
                  <input
                    id="lg-name" className="lg-input" type="text" autoComplete="name"
                    placeholder="Анна" value={name} onChange={(e) => setName(e.target.value)}
                    disabled={isPending} required
                  />
                </Field>
              )}

              <Field label="Эл. почта" htmlFor="lg-email">
                <input
                  id="lg-email" className="lg-input" type="email" inputMode="email" autoComplete="email"
                  placeholder="parent@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending} required
                />
              </Field>

              <Field label="Пароль" htmlFor="lg-pw" action={authView === 'login' ? <a href="/forgot-password" className="lg-forgot">Забыли пароль?</a> : undefined}>
                <div className="lg-input-wrap">
                  <input
                    id="lg-pw" className="lg-input lg-input--pw" type={showPw ? 'text' : 'password'}
                    autoComplete={authView === 'login' ? 'current-password' : 'new-password'}
                    placeholder={authView === 'login' ? 'Ваш пароль' : 'Минимум 8 символов'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending} required
                  />
                  <button type="button" className="lg-pwtoggle" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Скрыть пароль' : 'Показать пароль'}>
                    {showPw ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
              </Field>

              {authView === 'register' && (
                <Field label="Повторите пароль" htmlFor="lg-confirm">
                  <input
                    id="lg-confirm"
                    className={`lg-input ${pwMatch ? 'is-ok' : ''} ${pwMismatch ? 'is-bad' : ''}`}
                    type={showPw ? 'text' : 'password'} autoComplete="new-password"
                    placeholder="Ещё раз тот же пароль" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    disabled={isPending} required
                  />
                  <div className="lg-vhint" style={{ color: pwMatch ? '#3E8F50' : pwMismatch ? '#C9533B' : 'transparent' }}>
                    {pwMatch ? 'Пароли совпадают' : pwMismatch ? 'Пароли не совпадают' : '·'}
                  </div>
                </Field>
              )}

              {authView === 'register' && (
                <label className="lg-agree">
                  <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} disabled={isPending} />
                  <span>
                    Мне есть 18 лет, принимаю{' '}
                    <a href="/terms" target="_blank" rel="noopener">условия</a> и{' '}
                    <a href="/privacy" target="_blank" rel="noopener">политику конфиденциальности</a>
                  </span>
                </label>
              )}

              {error && <div className="lg-error" role="alert">{error}</div>}

              {loginNeedsConfirm && (
                <button
                  type="button" className="lg-secondary"
                  onClick={handleResend} disabled={resend === 'sending' || cooldown > 0}
                  style={{ opacity: resend === 'sending' || cooldown > 0 ? 0.6 : 1 }}
                >
                  {resend === 'sending' ? 'Отправляем…' : cooldown > 0 ? `Письмо ещё раз (${cooldown})` : 'Отправить письмо подтверждения ещё раз'}
                </button>
              )}
              {loginNeedsConfirm && resend === 'sent' && <p className="lg-ok">Письмо отправлено. Проверь почту и «Спам».</p>}

              <button type="submit" className="lg-cta" disabled={isPending}>
                {isPending
                  ? (authView === 'login' ? 'Заходим…' : 'Создаём…')
                  : (authView === 'login' ? 'Войти' : 'Создать аккаунт')}
              </button>

              {authView === 'login' ? (
                <p className="lg-switch">
                  Нет аккаунта?{' '}
                  <button type="button" className="lg-link" onClick={() => { setAuthView('register'); resetMessages(); }}>
                    Зарегистрироваться
                  </button>
                </p>
              ) : (
                <p className="lg-switch">
                  Уже есть аккаунт?{' '}
                  <button type="button" className="lg-link" onClick={() => { setAuthView('login'); resetMessages(); }}>
                    Войти
                  </button>
                </p>
              )}
            </form>

            <div className="lg-or"><span>или</span></div>
            <a className="lg-yandex" href={`/api/auth/yandex?next=${encodeURIComponent(next)}`}>
              <span className="lg-ya" aria-hidden="true">Я</span> Войти через Яндекс
            </a>
            </>
          )}

          {/* ── Ребёнок ──────────────────────────────────────────────── */}
          {mode === 'child' && (
            <div className="lg-form" key="child">
              <div className="lg-infocard">
                <div className="lg-badge" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#7A4E10">
                    <path d="M12 2.5l2.7 5.9 6.4.6-4.8 4.3 1.4 6.3L12 16.9 6.3 19.6l1.4-6.3-4.8-4.3 6.4-.6z" />
                  </svg>
                </div>
                <div className="lg-infotext">
                  Чтобы войти, попроси родителя зарегистрироваться в PIP и дать тебе{' '}
                  <strong>QR-код</strong> или прислать <strong>ссылку для входа</strong>.
                </div>
              </div>

              <button type="button" className="lg-cta lg-cta--icon" onClick={() => { setChildError(null); setChildOpen(true); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5A3D0E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3M21 14v.01M14 21h.01M21 21v-4M17.5 21H18" />
                </svg>
                Сканировать QR-код
              </button>

              <button type="button" className="lg-secondary" onClick={() => { setChildError(null); setChildOpen(true); }}>
                У меня есть ссылка-приглашение
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Оверлей входа по QR/ссылке (без живой камеры) ───────────────── */}
      {childOpen && (
        <div className="lg-ovl" role="dialog" aria-modal="true" aria-label="Вход по QR-коду" onKeyDown={trapTab} onClick={(e) => { if (e.target === e.currentTarget) setChildOpen(false); }}>
          <div className="lg-ovl-inner" ref={overlayRef} tabIndex={-1}>
            <h2 className="lg-ovl-title">Вход по QR-коду</h2>
            <p className="lg-ovl-sub">Открой приложение «Камера» на телефоне и наведи на QR-код, который показывает родитель — ссылка откроется сама.</p>

            <div className="lg-viewfinder" aria-hidden="true">
              <span className="lg-corner lg-corner--tl" /><span className="lg-corner lg-corner--tr" />
              <span className="lg-corner lg-corner--bl" /><span className="lg-corner lg-corner--br" />
              <svg width="92" height="92" viewBox="0 0 24 24" fill="none" stroke="#F6C84D" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
                <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3M21 14v.01M14 21h.01M21 21v-4M17.5 21H18" />
              </svg>
            </div>

            <form onSubmit={handleChildSubmit} style={{ width: '100%' }}>
              <div className="lg-ovl-or"><span>или вставь ссылку</span></div>
              <input
                className="lg-ovl-input" type="text" inputMode="url" autoComplete="off"
                placeholder="https://pipup.ru/join/…" value={childLink}
                onChange={(e) => { setChildLink(e.target.value); setChildError(null); }}
              />
              {childError && <p className="lg-ovl-err">{childError}</p>}
              <button type="submit" className="lg-cta" style={{ marginTop: 14 }}>Войти по ссылке</button>
            </form>

            <button type="button" className="lg-cancel" onClick={() => setChildOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

      <ScreenStyles />
    </div>
  );
}

function Field({ label, htmlFor, action, children }: { label: string; htmlFor: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="lg-field">
      <div className="lg-field-head">
        <label className="lg-label" htmlFor={htmlFor}>{label}</label>
        {action}
      </div>
      {children}
    </div>
  );
}

function translateLoginError(msg: string): string {
  if (msg.includes('Invalid login')) return 'Неверный email или пароль';
  if (msg.includes('Email not confirmed')) return 'Подтверди email — мы выслали письмо';
  return 'Что-то пошло не так. Попробуй ещё раз.';
}

function translateSignupError(msg: string): string {
  if (msg.includes('already registered')) return 'Этот email уже зарегистрирован — попробуй войти';
  if (msg.includes('Password')) return 'С паролем что-то не так — попробуй другой';
  if (msg.includes('email')) return 'Email выглядит странно — проверь';
  return 'Что-то пошло не так. Попробуй ещё раз.';
}

function ScreenStyles() {
  return <style>{styles}</style>;
}

const styles = `
.lg-sronly { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0; }
.lg-screen { min-height: 100dvh; background: #F4E6CD; display: flex; justify-content: center; overflow-x: hidden; }
.lg {
  position: relative; width: 100%; max-width: 480px; min-height: 100dvh;
  display: flex; flex-direction: column; justify-content: flex-end; overflow-x: hidden;
}
.lg-poster { position: absolute; top: 0; left: 0; width: 100%; height: auto; z-index: 1; user-select: none; pointer-events: none; }
.lg-sheet {
  position: relative; z-index: 3; margin-top: auto;
  background: rgba(255,248,236,0.97);
  -webkit-backdrop-filter: blur(18px); backdrop-filter: blur(18px);
  border-radius: 32px 32px 0 0;
  border-top: 1px solid rgba(255,255,255,0.8);
  box-shadow: 0 -10px 44px rgba(74,46,12,0.20);
  padding: 12px 22px calc(20px + env(safe-area-inset-bottom, 0px));
}
.lg-fade { position: absolute; left: 0; right: 0; top: -90px; height: 90px; pointer-events: none; background: linear-gradient(180deg, rgba(255,248,236,0), rgba(255,248,236,0.55)); }
.lg-grabber { width: 42px; height: 5px; border-radius: 99px; background: #E4D2B2; margin: 0 auto 12px; }
.lg-seg { position: relative; display: flex; background: #F1E2C6; border-radius: 14px; padding: 4px; margin-bottom: 16px; }
.lg-seg-slider { position: absolute; top: 4px; left: 4px; height: calc(100% - 8px); width: calc(50% - 4px); background: #fff; border-radius: 11px; box-shadow: 0 2px 6px rgba(120,80,20,0.14); transition: transform .32s cubic-bezier(.34,1.3,.5,1); }
.lg-seg-btn { position: relative; z-index: 1; flex: 1; height: 42px; border: none; background: transparent; font-family: var(--font-display); font-weight: 700; font-size: 15.5px; color: #5C4A2E; cursor: pointer; border-radius: 11px; -webkit-tap-highlight-color: transparent; }
.lg-seg-btn.is-active { color: #4A3A22; }
.lg-invite { display: flex; align-items: center; gap: 8px; padding: 10px 13px; margin-bottom: 14px; background: #FBEFD6; border: 1px solid #F0DFBE; border-radius: 12px; font-size: 13px; color: #6B563A; }
.lg-form { display: flex; flex-direction: column; gap: 11px; animation: lgFade .3s ease; }
@keyframes lgFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.lg-field { display: flex; flex-direction: column; gap: 6px; }
.lg-field-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.lg-label { font-family: var(--font-body, inherit); font-weight: 700; font-size: 13px; color: #6E5836; padding-left: 4px; }
.lg-input-wrap { position: relative; }
.lg-input {
  width: 100%; height: 54px; border-radius: 15px; border: 1.5px solid #EADCC0; background: #fff;
  padding: 0 16px; font-family: var(--font-body, inherit); font-weight: 500; font-size: 16px; color: #3B2C1A;
  transition: border-color .15s, box-shadow .15s; outline: none;
}
.lg-input::placeholder { color: #9E8A6E; }
.lg-input:focus { border-color: #E6A637; box-shadow: 0 0 0 3px rgba(230,166,55,0.18); }
.lg-input:disabled { opacity: 0.7; }
.lg-input--pw { padding-right: 96px; }
.lg-input.is-ok { border-color: #5BA86A; }
.lg-input.is-bad { border-color: #E2705A; }
.lg-pwtoggle {
  position: absolute; top: 4px; bottom: 4px; right: 4px;
  display: flex; align-items: center; justify-content: center; min-width: 44px; padding: 0 14px;
  border: none; background: transparent; cursor: pointer;
  font-family: var(--font-body, inherit); font-weight: 700; font-size: 13.5px; color: #A66C12;
}
.lg-vhint { font-family: var(--font-body, inherit); font-weight: 700; font-size: 12.5px; min-height: 15px; padding-left: 4px; }
.lg-forgot { display: inline-flex; align-items: center; padding: 2px 2px; font-family: var(--font-body, inherit); font-weight: 700; font-size: 12.5px; color: #A66C12; text-decoration: underline; text-underline-offset: 2px; white-space: nowrap; }
.lg-agree { display: flex; align-items: flex-start; gap: 9px; font-size: 12.8px; color: #6B563A; line-height: 1.45; cursor: pointer; padding: 0 2px; }
.lg-agree input { flex-shrink: 0; margin-top: 2px; width: 17px; height: 17px; accent-color: #E59A28; cursor: pointer; }
.lg-agree a { color: #3B2C1A; text-decoration: underline; text-underline-offset: 2px; }
.lg-cta {
  height: 56px; border: none; border-radius: 16px; cursor: pointer; width: 100%;
  background: linear-gradient(135deg, #F6C84D, #E59A28);
  box-shadow: 0 8px 18px rgba(220,150,40,0.38), inset 0 1px 0 rgba(255,255,255,0.55);
  font-family: var(--font-display); font-weight: 700; font-size: 18px; color: #5A3D0E; letter-spacing: 0.3px;
  transition: transform .12s, box-shadow .12s; -webkit-tap-highlight-color: transparent;
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
}
.lg-cta:active:not(:disabled) { transform: scale(0.975); box-shadow: 0 4px 12px rgba(220,150,40,0.30), inset 0 1px 0 rgba(255,255,255,0.55); }
.lg-cta:disabled { opacity: 0.7; cursor: default; }
.lg-cta--icon { height: 60px; }
.lg-secondary {
  height: 54px; width: 100%; border-radius: 16px; cursor: pointer;
  background: #FFFDF8; border: 1.5px solid #E7D6B6;
  font-family: var(--font-display); font-weight: 700; font-size: 16px; color: #9A7B45;
  transition: background .12s; -webkit-tap-highlight-color: transparent;
}
.lg-secondary:active:not(:disabled) { background: #F6ECD8; }
.lg-or { display: flex; align-items: center; gap: 12px; color: #A99B7E; font-size: 12.5px; margin: 14px 0 2px; }
.lg-or::before, .lg-or::after { content: ''; flex: 1; height: 1px; background: #E7DAC0; }
.lg-yandex { display: flex; align-items: center; justify-content: center; gap: 10px; height: 52px; border-radius: 16px; background: #fff; border: 1.5px solid #E7D6B6; color: #3B2C1A; font-family: var(--font-display); font-weight: 700; font-size: 15.5px; text-decoration: none; -webkit-tap-highlight-color: transparent; }
.lg-yandex:active { background: #F6ECD8; }
/* Внутри iOS-оболочки (App Store) вход через Яндекс скрыт — Guideline 4.8.
   Прячем вместе с разделителем «или»: иначе он повиснет впустую. */
html.pip-ios-app .lg-or, html.pip-ios-app .lg-yandex { display: none; }
.lg-ya { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; background: #FC3F1D; color: #fff; font-weight: 800; font-size: 15px; font-family: Arial, sans-serif; }
.lg-switch { text-align: center; font-family: var(--font-body, inherit); font-weight: 500; font-size: 14.5px; color: #6E5836; margin: 2px 0 0; }
.lg-link { border: none; background: transparent; cursor: pointer; font-family: inherit; font-weight: 800; font-size: 14.5px; color: #A66C12; padding: 0; text-decoration: underline; text-underline-offset: 2px; }
.lg-h1 { font-family: var(--font-display); font-weight: 700; font-size: 26px; color: #3B2C1A; margin: 0 0 8px; letter-spacing: -0.01em; }
.lg-p { font-family: var(--font-body, inherit); font-size: 14.5px; line-height: 1.55; color: #6B563A; margin: 0; }
.lg-ok { font-size: 13px; color: #3E8F50; font-weight: 600; }
.lg-err { font-size: 13px; color: #C9533B; font-weight: 600; }
.lg-error { background: rgba(226,112,90,0.12); color: #C9533B; padding: 10px 14px; border-radius: 12px; font-size: 13.5px; border: 1px solid rgba(226,112,90,0.3); }
.lg-infocard { display: flex; gap: 13px; align-items: flex-start; background: #FBEFD6; border: 1px solid #F0DFBE; border-radius: 16px; padding: 15px 16px; }
.lg-badge { flex-shrink: 0; width: 34px; height: 34px; border-radius: 10px; background: #F6C84D; display: flex; align-items: center; justify-content: center; }
.lg-infotext { font-family: var(--font-body, inherit); font-weight: 500; font-size: 14.5px; line-height: 1.5; color: #6B563A; }
.lg-infotext strong { color: #3B2C1A; font-weight: 800; }
.lg-ovl { position: fixed; inset: 0; z-index: 100; background: rgba(22,17,9,0.94); display: flex; justify-content: center; padding: max(72px, env(safe-area-inset-top)) 24px 32px; overflow-y: auto; }
.lg-ovl-inner { width: 100%; max-width: 380px; display: flex; flex-direction: column; align-items: center; outline: none; }
.lg-ovl-title { font-family: var(--font-display); font-weight: 700; font-size: 21px; color: #FBE9C4; margin: 0 0 10px; text-align: center; }
.lg-ovl-sub { font-family: var(--font-body, inherit); font-weight: 500; font-size: 14.5px; color: rgba(251,233,196,0.7); text-align: center; margin: 0 0 24px; line-height: 1.5; padding: 0 28px; }
.lg-viewfinder { position: relative; width: 248px; height: 248px; border-radius: 28px; background: rgba(255,255,255,0.04); display: flex; align-items: center; justify-content: center; margin-bottom: 26px; }
.lg-corner { position: absolute; width: 30px; height: 30px; border: 4px solid #F6C84D; }
.lg-corner--tl { top: 0; left: 0; border-right: none; border-bottom: none; border-radius: 10px 0 0 0; }
.lg-corner--tr { top: 0; right: 0; border-left: none; border-bottom: none; border-radius: 0 10px 0 0; }
.lg-corner--bl { bottom: 0; left: 0; border-right: none; border-top: none; border-radius: 0 0 0 10px; }
.lg-corner--br { bottom: 0; right: 0; border-left: none; border-top: none; border-radius: 0 0 10px 0; }
.lg-ovl-or { display: flex; align-items: center; gap: 12px; color: rgba(251,233,196,0.55); font-size: 12.5px; margin-bottom: 12px; }
.lg-ovl-or::before, .lg-ovl-or::after { content: ''; flex: 1; height: 1px; background: rgba(251,233,196,0.18); }
.lg-ovl-input {
  width: 100%; height: 52px; border-radius: 14px; border: 1.5px solid rgba(251,233,196,0.25);
  background: rgba(255,255,255,0.06); padding: 0 16px; color: #FBE9C4; font-size: 15px; outline: none;
  font-family: var(--font-body, inherit);
}
.lg-ovl-input::placeholder { color: rgba(251,233,196,0.5); }
.lg-ovl-input:focus { border-color: #F6C84D; }
.lg-ovl-err { color: #F0A58E; font-size: 13px; margin: 10px 0 0; text-align: center; }
.lg-cancel {
  margin-top: 20px; height: 50px; padding: 0 30px; border-radius: 99px; cursor: pointer;
  border: 1.5px solid rgba(251,233,196,0.3); background: rgba(255,255,255,0.06);
  font-family: var(--font-display); font-weight: 700; font-size: 16px; color: #FBE9C4;
}
`;
