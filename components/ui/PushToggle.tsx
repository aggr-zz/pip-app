'use client';

import { useState, useEffect } from 'react';

interface Props {
  profileId: string;
}

type Status = 'loading' | 'unsupported' | 'needs-pwa' | 'denied' | 'subscribed' | 'unsubscribed';

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
}

export function PushToggle({ profileId }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
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
      setStatus(sub ? 'subscribed' : 'unsubscribed');
    }).catch(() => setStatus('unsubscribed'));
  }, []);

  async function registerSW(): Promise<ServiceWorkerRegistration> {
    const existing = await navigator.serviceWorker.getRegistration('/sw.js');
    if (existing) return existing;
    return navigator.serviceWorker.register('/sw.js', { scope: '/' });
  }

  async function handleEnable() {
    setIsPending(true);
    try {
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
        🔕 Уведомления заблокированы в настройках браузера
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
