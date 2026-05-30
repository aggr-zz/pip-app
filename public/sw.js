// PIP Service Worker — v2
// Handles: Web Push, offline cache (network-first)

const CACHE_NAME = 'pip-v1';

// Статика, которую кэшируем при установке
const PRECACHE_URLS = [
  '/',
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

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Кэшируем успешные ответы
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Оффлайн — отдаём из кэша
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Для навигации — возвращаем корень (SPA fallback)
          if (request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
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
