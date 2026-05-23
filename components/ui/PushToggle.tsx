'use client';

import { useState, useEffect } from 'react';

interface Props {
  profileId: string;
}

type Status = 'loading' | 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed';

export function PushToggle({ profileId }: Props) {
  const [status, setStatus] = useState<Status>('loading');
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
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

  if (status === 'loading') return null;

  if (status === 'unsupported') return (
    <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
      Уведомления не поддерживаются в этом браузере
    </div>
  );

  if (status === 'denied') return (
    <div style={{
      fontSize: 12, color: 'var(--text-soft)', textAlign: 'center',
      padding: '10px 14px', background: 'var(--bg-surface-2)',
      borderRadius: 'var(--radius-md)', lineHeight: 1.5,
    }}>
      🔕 Уведомления заблокированы в настройках браузера
    </div>
  );

  const isOn = status === 'subscribed';

  return (
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

      {/* Toggle pill */}
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
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
