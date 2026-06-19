-- ========================================================================
-- pip — RLS policies (migration 002)
-- Каждый пользователь видит только данные своей семьи.
-- Waitlist открыт для anon INSERT (нужен для лендинга).
-- ========================================================================

-- ─── Включить RLS на всех таблицах ──────────────────────────────────────
alter table public.waitlist enable row level security;
alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_orders enable row level security;
alter table public.transactions enable row level security;
alter table public.invite_codes enable row level security;
alter table public.achievements enable row level security;


-- ═══════════════════════════════════════════════════════════════════════
-- WAITLIST — открыт для всех на INSERT, никто кроме сервиса не читает
-- ═══════════════════════════════════════════════════════════════════════

create policy "Anyone can join waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

-- Чтение waitlist — только из service_role (т.е. админ-панель / экспорт).
-- Никаких SELECT-политик для anon/authenticated → никто не видит email-ы.


-- ═══════════════════════════════════════════════════════════════════════
-- FAMILIES — пользователь видит только свою семью
-- ═══════════════════════════════════════════════════════════════════════

create policy "Users see their own family"
  on public.families for select
  to authenticated
  using (id = public.current_user_family_id());

create policy "Users update their own family"
  on public.families for update
  to authenticated
  using (id = public.current_user_family_id())
  with check (id = public.current_user_family_id());

-- INSERT при регистрации — отдельная функция (см. handle_new_user ниже).
-- DELETE недоступен через RLS — только через support.


-- ═══════════════════════════════════════════════════════════════════════
-- PROFILES — видимы внутри семьи, изменяются только своим владельцем или родителем
-- ═══════════════════════════════════════════════════════════════════════

create policy "See profiles in own family"
  on public.profiles for select
  to authenticated
  using (family_id = public.current_user_family_id());

create policy "Update own profile or as parent any child in family"
  on public.profiles for update
  to authenticated
  using (
    user_id = auth.uid()
    or (
      family_id = public.current_user_family_id()
      and exists (
        select 1 from public.profiles p
        where p.user_id = auth.uid() and p.role = 'parent'
      )
    )
  );

create policy "Parents can create profiles in their family"
  on public.profiles for insert
  to authenticated
  with check (
    family_id = public.current_user_family_id()
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'parent'
    )
  );


-- ═══════════════════════════════════════════════════════════════════════
-- TASKS — read all в семье, write только родителем
-- ═══════════════════════════════════════════════════════════════════════

create policy "See tasks in own family"
  on public.tasks for select
  to authenticated
  using (family_id = public.current_user_family_id());

create policy "Parents create tasks"
  on public.tasks for insert
  to authenticated
  with check (
    family_id = public.current_user_family_id()
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'parent'
    )
  );

create policy "Parents update tasks"
  on public.tasks for update
  to authenticated
  using (
    family_id = public.current_user_family_id()
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'parent'
    )
  );


-- ═══════════════════════════════════════════════════════════════════════
-- TASK COMPLETIONS — ребёнок может создавать (для своих task), родитель аппрувит
-- ═══════════════════════════════════════════════════════════════════════

create policy "See completions in own family"
  on public.task_completions for select
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where family_id = public.current_user_family_id()
    )
  );

create policy "Child marks own task completion"
  on public.task_completions for insert
  to authenticated
  with check (
    profile_id = public.current_user_profile_id()
  );

create policy "Parent updates completion (approve/reject)"
  on public.task_completions for update
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where family_id = public.current_user_family_id()
    )
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'parent'
    )
  );


-- ═══════════════════════════════════════════════════════════════════════
-- REWARDS — read all в семье, write только родителем
-- ═══════════════════════════════════════════════════════════════════════

create policy "See rewards in own family"
  on public.rewards for select
  to authenticated
  using (family_id = public.current_user_family_id());

create policy "Parents manage rewards"
  on public.rewards for all
  to authenticated
  using (
    family_id = public.current_user_family_id()
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'parent'
    )
  )
  with check (
    family_id = public.current_user_family_id()
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'parent'
    )
  );


-- ═══════════════════════════════════════════════════════════════════════
-- REWARD ORDERS — ребёнок создаёт, родитель fulfill-ит
-- ═══════════════════════════════════════════════════════════════════════

create policy "See reward orders in own family"
  on public.reward_orders for select
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where family_id = public.current_user_family_id()
    )
  );

create policy "Child orders for self"
  on public.reward_orders for insert
  to authenticated
  with check (profile_id = public.current_user_profile_id());

create policy "Parent updates order"
  on public.reward_orders for update
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where family_id = public.current_user_family_id()
    )
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'parent'
    )
  );


-- ═══════════════════════════════════════════════════════════════════════
-- TRANSACTIONS — read для своих, INSERT только родителем (или системой)
-- ═══════════════════════════════════════════════════════════════════════

create policy "See own transactions"
  on public.transactions for select
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where family_id = public.current_user_family_id()
    )
  );

create policy "Parents create transactions"
  on public.transactions for insert
  to authenticated
  with check (
    profile_id in (
      select id from public.profiles where family_id = public.current_user_family_id()
    )
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'parent'
    )
  );

-- UPDATE/DELETE на transactions НЕ разрешены (иммутабельная история).


-- ═══════════════════════════════════════════════════════════════════════
-- INVITE CODES — родитель создаёт, любой авторизованный может прочитать по коду
-- ═══════════════════════════════════════════════════════════════════════

create policy "Parents create invites"
  on public.invite_codes for insert
  to authenticated
  with check (
    family_id = public.current_user_family_id()
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and p.role = 'parent'
    )
  );

-- Чтение invite_code — отдельная функция (handle_invite_redeem),
-- т.к. до его принятия пользователь не в семье и RLS его не пустит.


-- ═══════════════════════════════════════════════════════════════════════
-- ACHIEVEMENTS — read внутри семьи, INSERT только из триггеров (можно ослабить позже)
-- ═══════════════════════════════════════════════════════════════════════

create policy "See achievements in own family"
  on public.achievements for select
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where family_id = public.current_user_family_id()
    )
  );


-- ═══════════════════════════════════════════════════════════════════════
-- АВТОМАТИЧЕСКОЕ создание семьи и профиля при регистрации
-- ═══════════════════════════════════════════════════════════════════════
-- При signup → создаём family + profile (родитель), привязанный к auth.users

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

  -- 1. Создаём семью
  insert into public.families (name)
  values (coalesce(new.raw_user_meta_data->>'family_name', 'Моя семья'))
  returning id into new_family_id;

  -- 2. Создаём профиль родителя
  insert into public.profiles (family_id, user_id, role, name)
  values (new_family_id, new.id, 'parent', user_name);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
