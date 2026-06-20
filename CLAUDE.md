# CLAUDE.md — PIP Project Context

> Этот файл читается автоматически при каждом старте сессии в Claude Code.
> Полная документация: `PROJECT.md` в этой же папке.

---

## Что за проект

**PIP** — семейное PWA-приложение для мотивации детей. Дети выполняют задания → получают PIP-монеты → обменивают на согласованные награды. Без реальных денег, без угроз.

- **Prod URL:** https://pipup.ru
- **GitHub:** github.com/aggr-zz/pip-app
- **Stack:** Next.js 15 App Router · TypeScript · Supabase · CSS Variables · PWA

---

## Git workflow

```bash
cd ~/Library/Mobile\ Documents/com~apple~CloudDocs/pip/pip-web/app
git add -A
git commit -m "feat/fix/chore: описание"
git push
# Vercel деплоит автоматически с main ветки
```

> ⚠️ zsh не любит `[id]` в путях — всегда используй `git add -A`, не `git add app/path/[id]/file.ts`

---

## Команды

```bash
# Локальная разработка
npm run dev

# Сборка (проверка ошибок)
npm run build

# TypeScript проверка
npx tsc --noEmit
```

> `ignoreBuildErrors: true` в `next.config.mjs` — TypeScript ошибки не ломают билд на Vercel, но их стоит фиксить локально.

---

## Архитектура: два режима доступа

**Родитель** — Supabase Auth (email/password). Cookie `sb-*`.

**Ребёнок** — без регистрации:
1. Родитель копирует ссылку `/join/[childId]` из профиля ребёнка
2. Ребёнок вводит 4-значный PIN
3. POST `/api/auth/child-pin` → cookie `pip_child_direct` (HMAC-JWT, 30 дней)
4. Все маршруты `/child/*` защищены этим токеном через middleware

---

## Структура маршрутов

```
/                    лендинг (неавт.) / редирект на /parent (авт.)
/parent              главная родителя
/parent/tasks        список заданий
/parent/tasks/new    создать задание
/parent/tasks/[id]   редактировать задание
/parent/rewards      каталог наград
/parent/children/[id] профиль ребёнка
/parent/profile      профиль родителя (+ инвайт второго родителя)
/parent/approvals/[id] подтверждение задания

/child/[id]          главная ребёнка
/child/[id]/shop     магазин
/child/[id]/profile  профиль
/child/[id]/achievements достижения

/join/[childId]      вход ребёнка по PIN (публичная)
/invite-family/[token] принятие инвайта второго родителя (публичная)
/forgot-password     / /reset-password
/terms  /privacy
/admin

API:
/api/auth/child-pin       POST — верификация PIN ребёнка
/api/auth/callback        GET  — Supabase OAuth
/api/push/subscribe       POST/DELETE — управление push-подписками
/api/cron/task-reminders  GET/POST — крон напоминаний (защищён x-cron-secret)
/api/assetlinks           GET — assetlinks.json для Android TWA (pages/api)
```

---

## Ключевые файлы

| Файл | Назначение |
|------|------------|
| `middleware.ts` | Auth routing. Публичные пути прописаны явно. |
| `lib/supabase/admin.ts` | Service role клиент — обходит RLS, для server actions |
| `lib/childSession.ts` | HMAC-JWT для `pip_child_direct` токена |
| `lib/getChildContext.ts` | Хелпер авторизации для всех `/child/*` страниц |
| `lib/webpush.ts` | Отправка Web Push без npm (Web Crypto API) |
| `lib/schedule.ts` | Логика расписания задач (daily/weekly/custom) |
| `lib/achievements.ts` | Каталог достижений |
| `app/parent/tasks/TaskForm.tsx` | Главная форма создания/редактирования задания |
| `app/parent/tasks/actions.ts` | Server actions для задач |
| `public/sw.js` | Service Worker (push + offline cache) |
| `pages/api/assetlinks.ts` | assetlinks.json для Android TWA |

---

## База данных

**Последняя миграция: `022_release2_ratelimit_pricesnapshot.sql`**

Канонический каталог миграций — `app/supabase/migrations/` (полная история 001–022).
Применяются вручную/скриптом к self-hosted Postgres (контейнер `supabase-db`).
022 добавляет: таблицу `auth_rate_limits` + RPC `rate_limit_check/fail/clear`
(лимит PIN и писем), колонку `task_completions.coin_value_snapshot` (фиксация
цены задачи на момент выполнения), снят INSERT-policy «Parents create transactions».

### Ключевые таблицы

| Таблица | Важные поля |
|---------|-------------|
| `profiles` | id, user_id (null у детей), family_id, role, name, pin, balance, avatar_color/emoji/url, archived_at |
| `families` | id, name, timezone, auto_approve_hours |
| `tasks` | id, family_id, title, icon, coin_value, schedule_type, schedule_days, assigned_to (uuid[]), requires_approval, requires_photo, remind_at (time, UTC+3), archived_at |
| `task_completions` | task_id, profile_id, status (pending/approved/rejected/auto_approved), photo_url |
| `rewards` | id, family_id, title, coin_cost, archived_at |
| `reward_orders` | reward_id, profile_id, status (pending/fulfilled/cancelled), goal (bool) |
| `family_invites` | family_id, created_by, token (unique), expires_at, used_at, used_by |
| `push_subscriptions` | profile_id, endpoint, p256dh, auth |
| `achievements` | profile_id, type |
| `coin_transactions` | profile_id, amount, reason (аудит-лог) |

### Ключевые RPC-функции

```sql
approve_task_completion(p_completion_id, p_awarded)
reject_task_completion(p_completion_id, p_reason)
order_reward_atomic(p_reward_id, p_profile_id)
fulfill_reward_order(p_order_id)
check_achievements(p_profile_id)
auto_approve_pending_completions(p_family_id)
```

---

## Переменные окружения

Хранятся в Vercel Dashboard → проект pip-app → Settings → Environment Variables.
Локально в `.env.local` (не в git).

```
NEXT_PUBLIC_SUPABASE_URL=          # из Supabase Project Settings
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # из Supabase Project Settings
SUPABASE_SERVICE_ROLE_KEY=         # из Supabase Project Settings (secret!)
NEXT_PUBLIC_SITE_URL=https://pipup.ru

CHILD_SESSION_SECRET=              # минимум 32 символа, случайная строка

NEXT_PUBLIC_VAPID_PUBLIC_KEY=BHwjvWgq5cdwDJEQy9BXhpmSlkgYoOA89MnesKUGAI4Ig4e1VOSkVeRszVFI1MKfWjgHBhDa22Drpeew8UCX3wY
VAPID_PRIVATE_KEY=                 # секрет, не публиковать
VAPID_SUBJECT=mailto:saymien1@gmail.com

CRON_SECRET=                       # для защиты /api/cron/task-reminders
```

> После изменения переменных в Vercel — обязательно Redeploy!

---

## Push-уведомления

Когда отправляются:
- Родитель одобрил задание → пуш ребёнку
- Родитель отклонил задание → пуш ребёнку
- Ребёнок заказал награду → пуш родителю
- Родитель выдал награду → пуш ребёнку
- Крон каждые 30 мин → напоминания по `remind_at` (МСК, ±15 мин)

iOS: push работает **только из установленного PWA** (добавлено на экран «Домой»).

---

## PWA / Android

- Манифест: `public/manifest.json`
- SW: `public/sw.js` (регистрируется через `components/ui/ServiceWorkerRegistration.tsx`)
- assetlinks: `pages/api/assetlinks.ts` → `/api/assetlinks` + rewrite в `next.config.mjs`
- TWA пакет для RuStore: сгенерирован через PWABuilder, лежит у основателя
- Keystore: `signing.keystore`, пароль — у основателя (хранить!)

---

## Дизайн-система

CSS-переменные, без Tailwind, без CSS-модулей. Inline styles + `styles/globals.css`.

```css
--color-coral      /* #EE6C4D — основной акцент */
--color-mint       /* зелёный */
--color-gold       /* золотой */
--color-ink        /* #0F1320 — основной текст */
--bg-page          /* фон страницы */
--bg-surface       /* карточки */
--font-display     /* Bricolage Grotesque */
/* body: Geist */
```

Фон родительских экранов: `#ECEEF6` (задан в `parent/layout.tsx`).
Паттерн высоты: `height: 100dvh` на outer → `flex: 1; minHeight: 0; overflow-y: auto` на content.

---

## Известные особенности

| Проблема | Решение |
|----------|---------|
| zsh glob с `[id]` | `git add -A` или экранировать `\[id\]` |
| Android: кнопки PIN не нажимаются | `div` + `onTouchStart` + `e.preventDefault()` вместо `button` |
| iOS: push только из PWA | `PushToggle` показывает инструкцию |
| `100vh` на мобильных | Использовать `100dvh` |
| `useSearchParams()` без Suspense | Next.js 15: обязателен `<Suspense>` |
| Vercel: переменные не применились | После добавления → Redeploy обязателен |
| `.well-known/` 404 | `pages/api/assetlinks.ts` + rewrite в `next.config.mjs` |
| git index.lock | `rm -f .git/HEAD.lock .git/index.lock` |
| Supabase RPC return types | `ignoreBuildErrors: true` в `next.config.mjs` |

---

## Текущий статус (июнь 2026)

**Что работает:**
- Полный цикл задания → монеты → награды
- Детский вход по QR/PIN без регистрации
- Push-уведомления (Web Push VAPID)
- Напоминания по расписанию (крон Vercel, каждые 30 мин)
- Несколько родителей через инвайт-ссылку
- Цель-копилка (ребёнок копит на конкретную награду)
- Достижения (11 типов)
- PWA (Service Worker, offline, манифест, shortcuts, share target)
- Android TWA пакет готов для RuStore

**Что НЕ сделано (следующие приоритеты):**
1. Монетизация — paywall, подписка (freemium модель запланирована)
2. Онбординг для новых пользователей
3. Аналитика и статистика для родителя
4. assetlinks.json окончательно не проверен (проблема с 404 была)
5. iarc_rating_id для RuStore (получить на ratingscertificate.org)
6. Реальные скриншоты для RuStore (сейчас программные заглушки)

---

## Инфраструктура

| Сервис | Где | Назначение |
|--------|-----|------------|
| Vercel | vercel.com → pip-app | Хостинг, авто-деплой с main |
| Supabase | app.supabase.com | БД + Auth + Storage |
| Timeweb DNS | timeweb.com | Домен pipup.ru |
| cron-job.org | (опционально) | Альтернатива если Vercel cron не работает |

DNS: `A @ 216.198.79.1` (Vercel IP). AAAA записи удалить если мешают.
