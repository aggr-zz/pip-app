'use client';

import { useState, useEffect } from 'react';

interface Props {
  profileId: string;
}

type Status = 'loading' | 'unsupported' | 'needs-pwa' | 'denied' | 'subscribed' | 'unsubscribed';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

type NativePush = {
  checkPermissions: () => Promise<{ receive?: string }>;
  requestPermissions: () => Promise<{ receive?: string }>;
  register: () => Promise<void>;
  addListener: (event: string, cb: (data: { value?: string }) => void) => void;
  removeAllListeners: () => Promise<void>;
};

/**
 * Нативные пуши доступны только внутри iOS-оболочки.
 *
 * Внутри WKWebView Apple закрывает и Web Push, и Service Worker, поэтому весь
 * блок ниже (подписка через pushManager) там не работает вовсе — единственный
 * канал уведомлений в приложении это APNs. Обращаемся через уже внедрённый мост
 * Capacitor: он сам добавляет каждому плагину addListener/requestPermissions,
 * так что npm-пакет на стороне сайта не нужен и бандл не тяжелеет.
 */
function getNativePush(): NativePush | null {
  if (typeof window === 'undefined') return null;
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, unknown> } }).Capacitor;
  const pn = cap?.Plugins?.PushNotifications as NativePush | undefined;
  return typeof pn?.register === 'function' ? pn : null;
}

/**
 * Просит систему выдать токен устройства и дожидается его.
 *
 * Токен приходит не ответом на register(), а отдельным событием, поэтому нужен
 * промис вокруг подписки. Таймаут обязателен: если система не ответит ни
 * успехом, ни ошибкой, без него интерфейс завис бы в «включаем» навсегда.
 */
async function registerForNativeToken(pn: NativePush): Promise<string | null> {
  // Слушатели не снимаются сами, а включить уведомления можно несколько раз за
  // сессию — без очистки они копились бы с каждой попыткой.
  await pn.removeAllListeners().catch(() => {});
  return new Promise<string | null>((resolve) => {
    let settled = false;
    const finish = (value: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 15000);
    pn.addListener('registration', (data) => finish(data?.value ?? null));
    pn.addListener('registrationError', () => finish(null));
    pn.register().catch(() => finish(null));
  });
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
}

export function PushToggle({ profileId }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [isPending, setIsPending] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [nativeToken, setNativeToken] = useState<string | null>(null);

  useEffect(() => {
    // Нативный канал проверяем первым: иначе в iOS-приложении сработала бы
    // ветка ниже и мы бы предложили «установить PWA» внутри уже установленного
    // приложения.
    const pn = getNativePush();
    if (pn) {
      setIsNative(true);
      (async () => {
        try {
          const perm = await pn.checkPermissions();
          if (perm?.receive === 'denied') { setStatus('denied'); return; }
          if (perm?.receive !== 'granted') { setStatus('unsubscribed'); return; }

          const token = await registerForNativeToken(pn);
          if (!token) { setStatus('unsubscribed'); return; }

          setNativeToken(token);
          setStatus('subscribed');
          // Самовосстановление: разрешение выдано, но токена в базе могло не
          // оказаться (прошлый запрос не дошёл). Досылаем идемпотентно.
          fetch('/api/push/apns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId, token }),
          }).catch(() => {});
        } catch {
          setStatus('unsubscribed');
        }
      })();
      return;
    }

    // На iOS уведомления работают только из установленного PWA
    if (isIOS() && !isInStandaloneMode()) {
      setStatus('needs-pwa');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setStatus('subscribed');
        // Самовосстановление: подписка в браузере уже есть, но в БД её могло не
        // оказаться (например, прошлый POST упал с ошибкой). Идемпотентно
        // до-отправляем её на сервер — upsert не создаёт дублей.
        fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, subscription: sub.toJSON() }),
        }).catch(() => {});
      } else {
        setStatus('unsubscribed');
      }
    }).catch(() => setStatus('unsubscribed'));
  }, [profileId]);

  async function registerSW(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration('/sw.js');
    if (existing) return existing;
    return navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  async function handleEnable() {
    setIsPending(true);
    try {
      const pn = getNativePush();
      if (pn) {
        const perm = await pn.requestPermissions();
        if (perm?.receive !== 'granted') { setStatus('denied'); return; }
        const token = await registerForNativeToken(pn);
        if (!token) return;
        const res = await fetch('/api/push/apns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, token }),
        });
        if (res.ok) { setNativeToken(token); setStatus('subscribed'); }
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        return;
      }

      const reg = await registerSW();
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId, subscription: sub.toJSON() }),
      });

      if (res.ok) setStatus('subscribed');
    } catch (err) {
      console.error('[PushToggle] enable error:', err);
    } finally {
      setIsPending(false);
    }
  }

  async function handleDisable() {
    setIsPending(true);
    try {
      if (getNativePush()) {
        // Отозвать системное разрешение из приложения нельзя — это делает сам
        // пользователь в Настройках. Поэтому просто убираем токен из базы,
        // и сервер перестаёт слать на это устройство.
        if (nativeToken) {
          await fetch('/api/push/apns', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profileId, token: nativeToken }),
          }).catch(() => {});
        }
        setNativeToken(null);
        setStatus('unsubscribed');
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId, endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus('unsubscribed');
    } catch (err) {
      console.error('[PushToggle] disable error:', err);
    } finally {
      setIsPending(false);
    }
  }

  // Пока идёт определение статуса — не рендерим ничего (секция тоже не нужна)
  if (status === 'loading') return null;

  const sectionTitle = (
    <h2 style={{
      fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17,
      letterSpacing: '-0.01em', margin: '0 0 12px',
    }}>
      Уведомления
    </h2>
  );

  if (status === 'needs-pwa') return (
    <section style={{ marginBottom: 24 }}>
      {sectionTitle}
      <div style={{
        fontSize: 13, color: 'var(--text-soft)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        padding: '14px 16px',
        lineHeight: 1.55,
      }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>
          📲 Добавь приложение на экран «Домой»
        </div>
        Уведомления на iPhone работают только из установленного приложения:
        <ol style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <li>Нажми <strong>«Поделиться»</strong> в Safari (иконка со стрелкой вверх)</li>
          <li>Выбери <strong>«На экран Домой»</strong></li>
          <li>Открой PIP с экрана — уведомления станут доступны</li>
        </ol>
      </div>
    </section>
  );

  if (status === 'unsupported') return null;

  if (status === 'denied') return (
    <section style={{ marginBottom: 24 }}>
      {sectionTitle}
      <div style={{
        fontSize: 13, color: 'var(--text-soft)', textAlign: 'center',
        padding: '12px 14px', background: 'var(--bg-surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)', lineHeight: 1.5,
      }}>
        🔕 {isNative
          ? 'Уведомления выключены. Включить можно в Настройках телефона → PIP → Уведомления.'
          : 'Уведомления заблокированы в настройках браузера'}
      </div>
    </section>
  );

  const isOn = status === 'subscribed';

  return (
    <section style={{ marginBottom: 24 }}>
      {sectionTitle}
      <button
        type="button"
        onClick={isOn ? handleDisable : handleEnable}
        disabled={isPending}
        style={{
          width: '100%', padding: '12px 16px',
          background: isOn ? 'var(--color-mint-soft)' : 'var(--bg-surface)',
          border: `1px solid ${isOn ? 'var(--color-mint)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: isPending ? 'wait' : 'pointer',
          fontFamily: 'inherit',
          transition: 'background 0.15s, border-color 0.15s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{isOn ? '🔔' : '🔕'}</span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
              {isOn ? 'Уведомления включены' : 'Включить уведомления'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-soft)', marginTop: 1 }}>
              {isOn ? 'Нажми чтобы отключить' : 'О новых заданиях и наградах'}
            </div>
          </div>
        </div>
        <div style={{
          width: 44, height: 26, borderRadius: 13,
          background: isOn ? 'var(--color-mint)' : 'var(--border-default)',
          position: 'relative', flexShrink: 0,
          transition: 'background 0.2s',
        }}>
          <div style={{
            position: 'absolute', top: 3,
            left: isOn ? 21 : 3,
            width: 20, height: 20, borderRadius: '50%',
            background: 'white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
            transition: 'left 0.2s',
          }} />
        </div>
      </button>
    </section>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
