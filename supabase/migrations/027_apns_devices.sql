-- 027: токены устройств для APNs (пуши в iOS-приложении).
--
-- Зачем отдельно от push_subscriptions: там Web Push (endpoint + ключи p256dh/auth),
-- здесь один непрозрачный токен от Apple. Смешивать в одной таблице пришлось бы
-- через nullable-колонки и проверки «какой это тип» на каждом чтении.
--
-- Почему это вообще понадобилось: внутри WKWebView (наша iOS-оболочка) Apple
-- закрывает и Web Push, и Service Worker, поэтому существующие VAPID-пуши там
-- не работают вовсе. В браузере и в RuStore-версии они продолжают работать.

create table if not exists public.apns_devices (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  -- Токен уникален по устройству, а НЕ по паре (профиль, токен): на одном
  -- телефоне могут по очереди войти разные члены семьи. Без этого ограничения
  -- уведомления ребёнка продолжали бы приходить на устройство, где он больше
  -- не залогинен. При повторной регистрации токен переезжает к новому профилю.
  token       text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists apns_devices_profile_idx on public.apns_devices (profile_id);

-- Читает и пишет только сервер (service_role). Включаем RLS без политик:
-- для anon и authenticated таблица становится недоступной полностью.
alter table public.apns_devices enable row level security;
