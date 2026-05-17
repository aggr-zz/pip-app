# pip — App

Основное приложение. Стек: Next.js 15 (App Router) + React 19 + TypeScript + Supabase.

## Запуск локально

```bash
# 1. Установить зависимости
npm install

# 2. Скопировать переменные окружения
cp .env.local.example .env.local

# 3. Подставить значения из Supabase Project Settings → API

# 4. Убедиться что в Supabase выполнены миграции
#    (см. ../supabase/migrations/)

# 5. Запустить dev-сервер
npm run dev
```

Открыть http://localhost:3001.

## Что готово

### Sprint 7 — стрики + история + достижения + реалтайм + ручная корректировка + тёмная тема + PWA ✅
- **Стрики работают**: `compute_child_streak` пересчитывает подряд идущие дни выполнений по таймзоне семьи. Обновляется хуком из всех 4 RPC (complete/approve/reject/auto_approve). Поля `current_streak` и `longest_streak` обновляются автоматически. Бэкфилл по миграции для уже существующих детей
- **`/child/[id]/history`**: лента 30 последних транзакций с иконками типа (✓ задача / 🎁 покупка / 💵 наличные / ↩ возврат / ⭐ бонус), блок реджектнутых задач с причиной от родителя, карточка стрика с рекордом
- **Достижения** (`/child/[id]/achievements`): 11 бейджей (first_task, tasks_10/50/100, coins_100/500/1000, streak_3/7/30, first_reward) в 4 категориях. Heading с прогресс-баром «N из 11», баннер «новое за сутки», карточки с эмодзи (заблокированные затемнены). Авторазблокировка через `check_achievements()` после каждого тапа «готово», подтверждения и выдачи награды
- **Реалтайм** через Supabase Realtime: `RealtimeRefresh` подписывается на `task_completions` и `reward_orders`, дебаунсит события 300мс и вызывает `router.refresh()` — пендинг-счётчики у родителя обновляются без перезагрузки страницы
- **Ручная корректировка** (`/parent/children/[id]/adjust`): родитель может дать бонус или штраф ±500 pip с обязательной причиной. Toggle «Бонус / Штраф», слайдер 1-500, 5 пресетов (10/25/50/100/200), live-превью «после баланс → N», защита от ухода в минус. Атомарная RPC `manual_adjust_balance` с блокировкой профиля
- **Тёмная тема**: блок `@media (prefers-color-scheme: dark)` в `tokens.css` — переопределяет ~30 CSS-переменных под тёмный фон. Респектит системную настройку, переключения в приложении пока нет (toggle на Sprint 8)
- **PWA-манифест** `/public/manifest.json` со start_url, theme_color, icons (192/512/maskable), shortcuts на «Подтвердить» и «Новая задача» (long-press по иконке на телефоне). Viewport + colorScheme в layout
- Миграции `010_sprint7.sql` (стрики + реалтайм), `011_sprint7_achievements.sql` (бейджи), `012_sprint7_manual_adjust.sql` (корректировка)

### Sprint 6 — админка для владельца ✅
- **`/admin`** — обзор: 4 big-stats (семьи/активные/дети/waitlist), быстрые ссылки, мини-метрики (задач, выполнений, наград, заказов, pip в обороте, выдано наличными), таблица регистраций за 14 дней
- **`/admin/families`** — все семьи с агрегатами (родители, дети, задачи, общий баланс pip, последняя активность), отсортировано по активности
- **`/admin/families/[id]`** — детальная карточка семьи: список участников, последние 20 выполнений / заказов / транзакций с цветными бейджами статусов
- **`/admin/waitlist`** — email-ы waitlist, статистика по источникам, экспорт в CSV с BOM для Excel
- **`/admin/stats`** — расширенная аналитика: размер, engagement, экономика, конверсии (waitlist→семья, 7д retention), топ-10 семей по задачам
- **Безопасность**: таблица `public.admins`, helper `is_current_user_admin()`, RLS-политики на SELECT для всех таблиц (стекаются с обычными по OR), внутри RPC-функций тоже проверка через `where is_current_user_admin()`
- **Стиль**: тёмный header (var(--color-ink)) с красным admin-бейджем — визуально отличается от родительского интерфейса
- Миграция `009_sprint6.sql`

### Sprint 5 — учёт выданных денег + статистика ✅
- **Экран выдачи** (`/parent/children/[id]/cash`): live-превью «после баланс → N», пресеты курса 1:1 / 2:1 / 5:1 / 10:1, форма со списанием pip и записью cash_amount в ₽, опциональный комментарий
- **История выдач**: список cash_payout-транзакций с датой, суммой, pip и причиной
- **Сводки**: за 30 дней и за всё время в KRT-card стиле
- **Статистика семьи** (`/parent/stats`): таб неделя / месяц / всё время, общие цифры (задач выполнено, заработано pip, потрачено в магазине, выдано наличными), карточки по детям, топ-5 задач
- Атомарная функция `record_cash_payout` с блокировкой FOR UPDATE на профиле
- SQL-функции `family_stats(family_id, since)` и `top_tasks(family_id, since)` через RPC
- Миграция `008_sprint5.sql`

### Sprint 4 — каталог наград + магазин ребёнка ✅
- **Каталог наград** (`/parent/rewards`): список с фильтром «активные / архив», эмодзи + название + цена + бейдж лимита
- **Создание награды** (`/parent/rewards/new`): название, описание, иконка (18 эмодзи), цена (1-100 000 pip с пресетами 10/50/100/300/500/1000/5000), лимит (много раз / один раз), доступность (всем / выборочно по детям)
- **Архивация** через `/parent/rewards/[id]` с подтверждением
- **Магазин для ребёнка** (`/child/[id]/shop`): доступные награды, отсортированные по цене, с фильтрацией по `available_to`. Заблокированные с подсказкой («не хватает монет» / «уже получал(а)»)
- **Заказ** через RewardCard: тап → подтверждение → атомарное списание + создание заказа
- **Заказы у родителя** (`/parent/orders`): pending заказы со счётчиком на дашборде
- **Выдача** через `/parent/orders/[id]`: «Выдал(а) ✓» переводит в fulfilled, либо «Отменить» с обязательной причиной → возврат монет через `refund`-транзакцию
- **Атомарность**: `order_reward_atomic`, `fulfill_reward_order`, `cancel_reward_order` — все денежные операции с FOR UPDATE на профиле, поддержка `limit_type='once'`
- Миграция `007_sprint4.sql`

### Sprint 3 — подтверждения + фото + автоаппрув ✅
- **Лента подтверждений** (`/parent/approvals`): pending выполнения с фото-индикатором, аватаром ребёнка, временем «N мин назад»
- **Детальная карточка** (`/parent/approvals/[id]`): задача, ребёнок, фото-доказательство (signed URL на 60 сек) → три варианта действий
- **Подтверждение** с тремя вариантами:
  - На всю сумму (mint кнопка)
  - Уменьшить начисление (слайдер 0-100% + пресеты 25/50/75/100%) — пример: задача на 20 pip, ребёнок не очень постарался — даём 10
  - Отклонить с обязательным комментарием (видит ребёнок в истории)
- **Фото-доказательство у ребёнка** (`PhotoUpload.tsx`): bottom-sheet модалка с «Снять на камеру» (mobile: capture=environment) и «Выбрать из галереи», превью с кнопкой «Заменить», загрузка в Supabase Storage с RLS-изоляцией по family_id
- **Storage-бакет `task-photos`** через миграцию: приватный, лимит 5 МБ, mime jpeg/png/webp, RLS только для своей семьи
- **Удаление фото** после approve/reject (privacy promise)
- **Автоаппрув** `auto_approve_pending_completions(family_id)`: при заходе родителя на `/parent/approvals` все pending старше `families.auto_approve_hours` (дефолт 24ч) автоматически аппрувятся + начисляют монеты + показывается баннер «N задач автоподтверждено»
- **Атомарность**: все денежные операции в SQL-функциях с FOR UPDATE на профиле → нет гонок при одновременных аппрувах
- Миграция `006_sprint3.sql`

### Sprint 2 — задачи: CRUD + выполнение ✅
- Родитель: `/parent/tasks` — список с фильтром по ребёнку и архивом
- Родитель: `/parent/tasks/new` — создание задачи (форма с иконкой, стоимостью, расписанием, кому)
- Родитель: `/parent/tasks/[id]` — редактирование и архивация
- Ребёнок: `/child/[id]` — список задач на сегодня с прогрессом, кнопка «готово»
- Атомарное выполнение через SQL-функцию `complete_task_atomic` (без гонок баланса):
  - если задача не требует подтверждения → `auto_approved` + транзакция +pip + обновление баланса
  - если требует → `pending`, ждёт Sprint 3
- 12 иконок задач (TaskIcon) + расписание helpers (`lib/schedule.ts`)
- Идемпотентность: повторный тап «готово» не создаёт дубль
- Миграция `005_sprint2.sql`

### Sprint 1 — добавление детей и PIN-режим ✅
- Создание детских профилей родителем (имя, возраст, цвет аватара, PIN из 4 цифр)
- Вход в режим конкретного ребёнка по PIN (cookie на 1 час)
- Выход из режима обратно к родителю
- Изоляция данных: ребёнок видит только свои данные через cookie + auth родителя
- Миграция `004_sprint1.sql`: добавлены `families.timezone/locale/auto_approve_hours`, `profiles.pin`, ограничения на `transactions` (cash_amount + currency, лимит manual_adjustment ±500, запрет отрицательного баланса), обновлены RLS под модель «родитель действует от имени детей»

### Авторизация
- Регистрация по email + пароль (`/signup`)
- Вход по email + пароль (`/login`)
- Вход через Google OAuth (нужно настроить provider в Supabase Dashboard → Authentication → Providers → Google)
- Email-подтверждение (Supabase отправляет письмо при signup)
- Автоматическое создание `family` + `profile` (родителя) при регистрации — через триггер БД `handle_new_user`

### Защита роутов
- Middleware (`middleware.ts`) проверяет сессию на каждом запросе
- `/parent` и `/child` доступны только залогиненным
- `/login` и `/signup` редиректят залогиненных на `/parent`
- Параметр `?next=/path` сохраняет, куда пользователь шёл до логина

### UI-компоненты
- `PipLogo` — логотип
- `Button` — 5 вариантов × 3 размера × состояния
- `Avatar` — 6 цветов × 5 размеров
- `Coin` — `CoinDot`, `CoinPill`, `CoinBalance`

### Страницы
- `/` — редиректит на `/login` или `/parent`/`/child` в зависимости от роли
- `/login`, `/signup` — авторизация
- `/parent` — дашборд родителя (выборка детей, подсчёт подтверждений)
- `/parent/children/new` — создание профиля ребёнка с PIN-кодом (**Sprint 1**)
- `/parent/children/[id]` — детальный профиль ребёнка + кнопка «Войти в режим …» (**Sprint 1**)
- `/child/[id]` — режим ребёнка: проверяет cookie от `enterChildMode` (**Sprint 1**)
- `/child` — заглушка-редирект (когда нужен список доступных профилей)

### Модель пользователей
**Один auth-аккаунт = одна семья.** Дети — это профили внутри семьи без своего `user_id`, привязанные PIN-кодом (4 цифры). Чтобы зайти в режим ребёнка, родитель (или сам ребёнок на доверенном устройстве) вводит PIN — устанавливается cookie `pip_active_child` на 1 час, и доступен путь `/child/[id]`. Auth-сессия Supabase всегда родительская.

Server actions (`app/parent/children/actions.ts`):
- `addChild({name, age, color, pin})` — создаёт детский профиль
- `enterChildMode({childId, pin})` — проверяет PIN, ставит cookie
- `exitChildMode()` — удаляет cookie
- `getActiveChildId()` — читает cookie (для `/child/[id]`)

### Дизайн-система
- CSS-токены перенесены из `pip-tokens.css` handoff-пакета в `styles/tokens.css`
- 325 строк токенов — цвета, шрифты, отступы, радиусы, тени, утилитарные классы

## Что нужно дописать

Каждая фича — это новые роуты + компоненты + Supabase-запросы. Следуй шаблону существующих страниц.

### Sprint 2 — задачи (CRUD + выполнение) ✅
- [x] `/parent/tasks` — список задач семьи, фильтры по детям
- [x] `/parent/tasks/new` — создание задачи (форма)
- [x] `/parent/tasks/[id]` — редактирование, архивация
- [x] `/child/[id]` — список задач на сегодня с прогрессом
- [x] Отметка выполнения ребёнком (`complete_task_atomic` SQL-функция)

### Sprint 3 — подтверждения + транзакции ✅
- [x] `/parent/approvals` — лента подтверждений с фото
- [x] Approval/reject с уменьшением монет, начисление транзакций
- [x] Авто-аппрув по `families.auto_approve_hours` (lazy, при заходе родителя)
- [x] Storage-бакет task-photos с RLS-изоляцией по family_id
- [x] Удаление фото после аппрува/реджекта

### Sprint 4 — награды ✅
- [x] `/parent/rewards`, `/parent/rewards/new` — каталог + создание
- [x] `/child/[id]/shop` — магазин для ребёнка
- [x] Заказ → списание монет → fulfill родителем
- [x] Отмена заказа → возврат монет через refund
- [x] Лимит `limit_type='once'` (weekly/monthly отложены на Sprint 7)

### Sprint 5 — учёт выданных денег + статистика ✅
- [x] `/parent/children/[id]/cash` — экран обмена pip ↔ ₽, история, сводки за 30 дней
- [x] `/parent/stats` — статистика семьи: per-child + топ задач, фильтр период
- [x] Атомарная функция `record_cash_payout` (баланс под FOR UPDATE)

### Sprint 6 — админка ✅
- [x] `/admin` — обзор с big-stats, quick links, регистрации за 14 дней
- [x] `/admin/families` — список всех семей с агрегатами и сортировкой по активности
- [x] `/admin/families/[id]` — детальная карточка: состав, выполнения, заказы, транзакции
- [x] `/admin/waitlist` — email-ы с фильтрами по источнику + кнопка экспорта в CSV
- [x] `/admin/waitlist/export` — endpoint CSV с BOM для Excel
- [x] `/admin/stats` — расширенная статистика: размер, engagement, экономика, средние, funnel, топ-10 семей
- [x] Таблица `public.admins` + helper `is_current_user_admin()` + RLS-политики на SELECT для всех таблиц семьи

### Sprint 7 — стрики, история, реалтайм, тёмная тема, PWA ✅
- [x] Стрики с автообновлением через `compute_child_streak` + хук во все 4 RPC (complete/approve/reject/auto_approve)
- [x] `/child/[id]/history` — лента транзакций + блок реджектнутых задач с причиной
- [x] Реалтайм через Supabase Realtime: `RealtimeRefresh` на `/parent` и `/parent/approvals` подписывается на task_completions + reward_orders и делает router.refresh при изменениях
- [x] Тёмная тема через `@media (prefers-color-scheme: dark)` в tokens.css — респектит системную настройку
- [x] PWA-манифест с shortcuts на основные действия + viewport + theme-color по схеме

### Средний приоритет
- [ ] `/parent/stats` — статистика, графики
- [ ] `/parent/settings` — настройки, приглашение со-родителя
- [ ] Реалтайм-обновления (Supabase Realtime подписки) — баланс ребёнка обновляется без перезагрузки
- [ ] Темная тема
- [ ] PWA-манифест и сервис-воркер

## Как добавить новую страницу — паттерн

Пример: страница списка задач для родителя.

```tsx
// app/parent/tasks/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Запрос с RLS: получаем только задачи своей семьи
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .is('archived_at', null)
    .order('created_at', { ascending: false });

  return (
    <main>
      <h1>Задания</h1>
      {tasks?.map(t => <div key={t.id}>{t.title}</div>)}
    </main>
  );
}
```

Никаких отдельных API-роутов — Supabase напрямую обращается к Postgres с проверкой RLS.

## Как добавить мутацию — паттерн

Используй Server Actions (Next.js 15):

```tsx
// app/parent/tasks/actions.ts
'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  // RLS проверит что юзер — родитель в семье
  await supabase.from('tasks').insert({
    title: String(formData.get('title')),
    coin_value: Number(formData.get('coin_value')),
    // ...
  });
  revalidatePath('/parent/tasks');
}
```

## Деплой на Vercel

1. Запушить в GitHub.
2. На vercel.com → Add New → Project → выбрать репозиторий.
3. Root Directory: `app`.
4. Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_SITE_URL` (например, `https://app.pip.app`)
5. Deploy.
6. В Supabase Dashboard → Authentication → URL Configuration добавить:
   - Site URL: `https://app.pip.app`
   - Redirect URLs: `https://app.pip.app/api/auth/callback`

## OAuth с Google — настройка

1. В Google Cloud Console создать OAuth client (Web app).
2. Authorized redirect URI: `https://<your-project>.supabase.co/auth/v1/callback`
3. В Supabase Dashboard → Authentication → Providers → Google:
   - Включить
   - Подставить Client ID и Client Secret
4. В Site URL добавить домен приложения

После этого кнопка «Войти через Google» начнёт работать.
