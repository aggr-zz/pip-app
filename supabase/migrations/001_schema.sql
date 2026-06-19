-- ========================================================================
-- pip — schema migration 001
-- All tables for the application + waitlist (used by landing page)
-- ========================================================================

-- ─── Extensions ─────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Waitlist (для лендинга) ────────────────────────────────────────────
-- Доступна всем для INSERT (см. RLS в 002).
-- Используется до запуска приложения для сбора email-ов.
create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  source text,                      -- откуда пришёл (utm, страница и т.п.)
  created_at timestamptz default now()
);

create index waitlist_created_at_idx on public.waitlist (created_at desc);


-- ─── Families ──────────────────────────────────────────────────────────
-- Корневая сущность. Одна семья = один аккаунт = несколько пользователей.
create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);


-- ─── Profiles ───────────────────────────────────────────────────────────
-- Профиль пользователя (родитель или ребёнок) внутри семьи.
-- Связан с auth.users(id) если у него есть свой логин.
-- Для младших детей user_id может быть null — родитель управляет их профилем.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  role text not null check (role in ('parent', 'child')),
  name text not null,
  birth_year int,
  avatar_color text default 'coral' check (avatar_color in ('coral','mint','ink','gold','rose','sky')),
  balance int default 0,            -- кэш текущего баланса
  current_streak int default 0,
  longest_streak int default 0,
  archived_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id)                  -- один auth-юзер = один профиль
);

create index profiles_family_id_idx on public.profiles (family_id);
create index profiles_user_id_idx on public.profiles (user_id);


-- ─── Tasks (шаблоны заданий) ────────────────────────────────────────────
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  icon text,                        -- ключ из дизайн-системы: 'hygiene', 'bedroom', ...
  category text,
  coin_value int not null check (coin_value > 0 and coin_value <= 500),
  schedule_type text not null check (schedule_type in ('daily', 'weekdays', 'custom', 'once')),
  schedule_days int[],              -- 0=пн, 6=вс (для schedule_type='custom')
  deadline_time time,
  requires_approval boolean default true,
  requires_photo boolean default false,
  assigned_to uuid[] not null,      -- массив profile.id
  created_by uuid not null references public.profiles(id),
  archived_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index tasks_family_id_idx on public.tasks (family_id) where archived_at is null;


-- ─── Task completions ──────────────────────────────────────────────────
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','auto_approved')),
  completed_at timestamptz default now(),
  scheduled_for date not null,
  photo_path text,                  -- путь в Supabase Storage, удаляется после approve
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  awarded_coins int,
  rejection_reason text,
  idempotency_key text unique,
  created_at timestamptz default now()
);

create index task_completions_profile_status_idx
  on public.task_completions (profile_id, status, completed_at desc);
create index task_completions_pending_idx
  on public.task_completions (status, completed_at)
  where status = 'pending';


-- ─── Rewards (каталог наград) ──────────────────────────────────────────
create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  description text,
  icon text,                        -- эмодзи или ключ
  image_url text,
  coin_cost int not null check (coin_cost > 0),
  available_to uuid[],              -- null = всем детям в семье
  limit_type text default 'unlimited' check (limit_type in ('unlimited', 'once', 'weekly', 'monthly')),
  archived_at timestamptz,
  created_at timestamptz default now()
);

create index rewards_family_id_idx on public.rewards (family_id) where archived_at is null;


-- ─── Reward orders ─────────────────────────────────────────────────────
create table public.reward_orders (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.rewards(id),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled')),
  coin_cost_at_order int not null,  -- snapshot цены на момент заказа
  ordered_at timestamptz default now(),
  fulfilled_at timestamptz,
  fulfilled_by uuid references public.profiles(id),
  cancellation_reason text,
  created_at timestamptz default now()
);

create index reward_orders_pending_idx on public.reward_orders (status) where status = 'pending';


-- ─── Transactions (иммутабельный журнал монет) ─────────────────────────
-- Изменения баланса ВСЕГДА через создание новой транзакции, не через UPDATE.
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'task_reward', 'reward_purchase', 'manual_adjustment',
    'cash_payout', 'refund', 'achievement_bonus'
  )),
  amount int not null,              -- может быть отрицательным
  balance_after int not null,
  cash_amount_rub numeric(10, 2),   -- только для type='cash_payout'
  reason text,
  related_task_completion_id uuid references public.task_completions(id),
  related_reward_order_id uuid references public.reward_orders(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now()
);

create index transactions_profile_idx on public.transactions (profile_id, created_at desc);
create index transactions_cash_idx on public.transactions (profile_id, created_at desc) where type = 'cash_payout';


-- ─── Invite codes (для подключения детей и со-родителей) ───────────────
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  code text unique not null,
  pre_filled_profile_id uuid references public.profiles(id),  -- если приглашаем под конкретный детский профиль
  for_role text not null check (for_role in ('child', 'parent')),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by_user_id uuid references auth.users(id),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz default now()
);

create index invite_codes_code_idx on public.invite_codes (code) where used_at is null;


-- ─── Achievements (бейджи) ────────────────────────────────────────────
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  achievement_code text not null,   -- 'streak_7', 'coin_1000' и т.п.
  unlocked_at timestamptz default now(),
  unique (profile_id, achievement_code)
);


-- ═══════════════════════════════════════════════════════════════════════
-- HELPERS — функции для удобства
-- ═══════════════════════════════════════════════════════════════════════

-- Возвращает family_id текущего пользователя (по auth.uid())
create or replace function public.current_user_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- Возвращает profile.id текущего пользователя
create or replace function public.current_user_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where user_id = auth.uid() limit 1;
$$;


-- ═══════════════════════════════════════════════════════════════════════
-- TRIGGERS — автоматическое обновление баланса при транзакции
-- ═══════════════════════════════════════════════════════════════════════

create or replace function public.update_balance_on_transaction()
returns trigger
language plpgsql
as $$
begin
  -- balance_after должен быть передан клиентом, мы только синхронизируем profiles.balance
  update public.profiles
  set balance = new.balance_after
  where id = new.profile_id;
  return new;
end;
$$;

create trigger on_transaction_insert
  after insert on public.transactions
  for each row
  execute function public.update_balance_on_transaction();


-- Updated_at автотриггер для tasks
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.update_updated_at();
