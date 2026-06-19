-- ========================================================================
-- pip — Sprint 1 migration (004)
-- Изменения:
--   1. families: timezone, locale, auto_approve_hours (H1)
--   2. profiles.pin для детей (A3, PIN-профиль вместо своего auth)
--   3. transactions: cash_amount + currency (C1, было cash_amount_rub)
--   4. manual_adjustment лимит ±500 (C2)
--   5. balance < 0 запрещён через trigger (C3)
--   6. RLS обновлён под модель «родитель действует от имени детей»
-- ========================================================================

-- ─── 1. Families settings ───────────────────────────────────────────────
alter table public.families
  add column if not exists timezone text not null default 'Europe/Moscow',
  add column if not exists locale text not null default 'ru' check (locale in ('ru', 'en')),
  add column if not exists auto_approve_hours int not null default 24
    check (auto_approve_hours >= 0 and auto_approve_hours <= 168);


-- ─── 2. Profiles: PIN для детей ─────────────────────────────────────────
alter table public.profiles
  add column if not exists pin text;

-- Формат: 4 цифры. Только для children, у parents должен быть null.
alter table public.profiles
  drop constraint if exists profiles_pin_format;
alter table public.profiles
  add constraint profiles_pin_format check (
    (role = 'child' and pin ~ '^\d{4}$')
    or (role = 'parent' and pin is null)
  );


-- ─── 3. Transactions: cash_amount + currency ────────────────────────────
-- Переименование столбца + добавление валюты
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name = 'cash_amount_rub'
  ) then
    alter table public.transactions rename column cash_amount_rub to cash_amount;
  end if;
end$$;

alter table public.transactions
  add column if not exists currency text default 'RUB'
    check (currency ~ '^[A-Z]{3}$');

-- cash_amount имеет смысл только для cash_payout
alter table public.transactions
  drop constraint if exists transactions_cash_only_for_payout;
alter table public.transactions
  add constraint transactions_cash_only_for_payout check (
    (type = 'cash_payout' and cash_amount is not null and cash_amount > 0)
    or (type != 'cash_payout' and cash_amount is null)
  );


-- ─── 4. Лимит ручной корректировки ±500 (C2) ────────────────────────────
alter table public.transactions
  drop constraint if exists transactions_manual_adjustment_limit;
alter table public.transactions
  add constraint transactions_manual_adjustment_limit check (
    type != 'manual_adjustment' or abs(amount) <= 500
  );


-- ─── 5. Запрет отрицательного баланса (C3) ──────────────────────────────
create or replace function public.check_balance_non_negative()
returns trigger
language plpgsql
as $$
begin
  if new.balance_after < 0 then
    raise exception 'Баланс не может быть отрицательным (получилось %)', new.balance_after
      using hint = 'Уменьши списание или начисли монеты перед операцией';
  end if;
  return new;
end;
$$;

drop trigger if exists check_balance_non_negative_trigger on public.transactions;
create trigger check_balance_non_negative_trigger
  before insert on public.transactions
  for each row
  execute function public.check_balance_non_negative();


-- ─── 6. RLS: родитель действует за детей (A3) ───────────────────────────
-- В MVP дети не имеют своего auth.user. Все запросы идут от родителя,
-- но profile_id в task_completions / reward_orders / transactions может
-- указывать на любой профиль семьи (не только текущего пользователя).

-- task_completions: разрешаем INSERT для любого ребёнка семьи
drop policy if exists "Child marks own task completion" on public.task_completions;
drop policy if exists "Family members insert completions" on public.task_completions;
create policy "Family members insert completions"
  on public.task_completions for insert
  to authenticated
  with check (
    profile_id in (
      select id from public.profiles where family_id = public.current_user_family_id()
    )
  );

-- reward_orders: то же самое
drop policy if exists "Child orders for self" on public.reward_orders;
drop policy if exists "Family members create orders" on public.reward_orders;
create policy "Family members create orders"
  on public.reward_orders for insert
  to authenticated
  with check (
    profile_id in (
      select id from public.profiles where family_id = public.current_user_family_id()
    )
  );


-- ─── 7. Обновлённый handle_new_user trigger ─────────────────────────────
-- Использует новые поля families.locale/timezone из user_metadata если есть.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id uuid;
  user_name text;
begin
  user_name := coalesce(
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- 1. Создаём семью с настройками
  insert into public.families (name, locale, timezone)
  values (
    coalesce(new.raw_user_meta_data->>'family_name', 'Моя семья'),
    coalesce(new.raw_user_meta_data->>'locale', 'ru'),
    coalesce(new.raw_user_meta_data->>'timezone', 'Europe/Moscow')
  )
  returning id into new_family_id;

  -- 2. Создаём профиль родителя (без PIN)
  insert into public.profiles (family_id, user_id, role, name, avatar_color)
  values (new_family_id, new.id, 'parent', user_name, 'ink');

  -- TODO Sprint 2: seed_starter_content(new_family_id) — сидинг
  --     дефолтных задач и наград по families.locale

  return new;
end;
$$;
