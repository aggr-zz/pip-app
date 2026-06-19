// PIP Service Worker — v4
// Handles: Web Push, offline cache (ТОЛЬКО статика — НЕ HTML и НЕ /_next/*)
//
// ВАЖНО: навигацию (HTML/RSC) и сборку Next (/_next/*) НЕ кэшируем. Иначе после
// деплоя установленный PWA отдавал из кэша старые чанки и server-action id →
// "Failed to find Server Action" / ChunkLoadError, пока вручную не очистишь кэш.

const CACHE_NAME = 'pip-v4';

// Статика, которую кэшируем при установке (без HTML — '/' тут быть НЕ должно).
const PRECACHE_URLS = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  event.waitUntil(clients.claim());
});

// ─── Fetch — Network first, cache fallback ────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Только GET, только same-origin или наши CDN-ресурсы
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Пропускаем API, Supabase, сторонние домены — только сеть
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('googleapis') ||
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  // Навигацию (HTML/RSC) и /_next/* НЕ перехватываем — всегда из сети.
  // Это исключает выдачу устаревших чанков/server-action после деплоя.
  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    url.pathname.startsWith('/_next/')
  ) {
    return;
  }

  // Остальная статика (иконки, манифест, изображения) — network-first с кэшем.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ─── Push ─────────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'PIP', body: event.data.text(), url: '/' };
  }

  const {
    title = 'PIP',
    body = '',
    icon = '/icon-192.png',
    badge = '/favicon-32.png',
    url = '/',
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data: { url },
      vibrate: [100, 50, 100],
    })
  );
});

// ─── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
