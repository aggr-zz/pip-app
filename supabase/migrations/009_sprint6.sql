-- ========================================================================
-- pip — Sprint 6 migration (009): admin views
-- Read-only админка для владельца проекта.
--
-- Concept: админ — это обычный пользователь Supabase Auth, плюс запись в
-- public.admins. RLS-политики дают админам SELECT на всех таблицах семьи.
-- WRITE-операции пока через Supabase Dashboard SQL Editor (для безопасности).
-- ========================================================================


-- ─── 1. Admins table ───────────────────────────────────────────────────
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz default now(),
  notes text
);

-- RLS: только админы могут SELECT (защита от утечки списка админов)
alter table public.admins enable row level security;

drop policy if exists "Admins see admins" on public.admins;
create policy "Admins see admins"
  on public.admins for select
  to authenticated
  using (exists (select 1 from public.admins a where a.user_id = auth.uid()));


-- ─── 2. Helper function ────────────────────────────────────────────────
create or replace function public.is_current_user_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.admins where user_id = auth.uid());
$$;

grant execute on function public.is_current_user_admin() to authenticated;


-- ─── 3. RLS policies: админы видят всё ─────────────────────────────────
-- Эти политики СТЕКАЮТСЯ с существующими по OR — обычные юзеры видят
-- только свою семью, админы видят всё.

drop policy if exists "Admins see all families" on public.families;
create policy "Admins see all families"
  on public.families for select
  to authenticated
  using (public.is_current_user_admin());

drop policy if exists "Admins see all profiles" on public.profiles;
create policy "Admins see all profiles"
  on public.profiles for select
  to authenticated
  using (public.is_current_user_admin());

drop policy if exists "Admins see all tasks" on public.tasks;
create policy "Admins see all tasks"
  on public.tasks for select
  to authenticated
  using (public.is_current_user_admin());

drop policy if exists "Admins see all task_completions" on public.task_completions;
create policy "Admins see all task_completions"
  on public.task_completions for select
  to authenticated
  using (public.is_current_user_admin());

drop policy if exists "Admins see all rewards" on public.rewards;
create policy "Admins see all rewards"
  on public.rewards for select
  to authenticated
  using (public.is_current_user_admin());

drop policy if exists "Admins see all reward_orders" on public.reward_orders;
create policy "Admins see all reward_orders"
  on public.reward_orders for select
  to authenticated
  using (public.is_current_user_admin());

drop policy if exists "Admins see all transactions" on public.transactions;
create policy "Admins see all transactions"
  on public.transactions for select
  to authenticated
  using (public.is_current_user_admin());

drop policy if exists "Admins see waitlist" on public.waitlist;
create policy "Admins see waitlist"
  on public.waitlist for select
  to authenticated
  using (public.is_current_user_admin());


-- ─── 4. admin_families_overview ────────────────────────────────────────
-- Список всех семей с агрегатами для /admin/families
create or replace function public.admin_families_overview()
returns table (
  id uuid,
  name text,
  created_at timestamptz,
  child_count int,
  parent_count int,
  total_pip_balance int,
  task_count int,
  last_activity timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with check_admin as (select public.is_current_user_admin() as ok),
  family_activity as (
    select
      p.family_id,
      max(tc.completed_at) as last_completion
    from public.profiles p
    left join public.task_completions tc on tc.profile_id = p.id
    group by p.family_id
  ),
  family_tasks as (
    select family_id, count(*)::int as task_count
    from public.tasks
    where archived_at is null
    group by family_id
  )
  select
    f.id,
    f.name,
    f.created_at,
    count(*) filter (where p.role = 'child' and p.archived_at is null)::int,
    count(*) filter (where p.role = 'parent' and p.archived_at is null)::int,
    coalesce(sum(p.balance) filter (where p.role = 'child' and p.archived_at is null), 0)::int,
    coalesce(ft.task_count, 0),
    fa.last_completion
  from public.families f
  left join public.profiles p on p.family_id = f.id
  left join family_activity fa on fa.family_id = f.id
  left join family_tasks ft on ft.family_id = f.id
  where (select ok from check_admin)
  group by f.id, f.name, f.created_at, fa.last_completion, ft.task_count
  order by fa.last_completion desc nulls last, f.created_at desc;
$$;

grant execute on function public.admin_families_overview() to authenticated;


-- ─── 5. admin_stats_overview ───────────────────────────────────────────
-- Сводные цифры по всей системе
create or replace function public.admin_stats_overview()
returns table (
  total_families int,
  total_parents int,
  total_children int,
  active_families_7d int,
  total_tasks int,
  total_completions int,
  total_rewards int,
  total_orders_fulfilled int,
  total_pip_in_circulation bigint,
  total_cash_paid numeric,
  total_waitlist int
)
language sql
stable
security definer
set search_path = public
as $$
  with check_admin as (select public.is_current_user_admin() as ok),
  active as (
    select count(distinct p.family_id)::int as n
    from public.profiles p
    join public.task_completions tc on tc.profile_id = p.id
    where tc.completed_at > now() - interval '7 days'
  )
  select
    (select count(*)::int from public.families where (select ok from check_admin)),
    (select count(*)::int from public.profiles where role = 'parent' and archived_at is null and (select ok from check_admin)),
    (select count(*)::int from public.profiles where role = 'child' and archived_at is null and (select ok from check_admin)),
    coalesce((select n from active), 0),
    (select count(*)::int from public.tasks where archived_at is null and (select ok from check_admin)),
    (select count(*)::int from public.task_completions where status in ('approved','auto_approved') and (select ok from check_admin)),
    (select count(*)::int from public.rewards where archived_at is null and (select ok from check_admin)),
    (select count(*)::int from public.reward_orders where status = 'fulfilled' and (select ok from check_admin)),
    coalesce((select sum(balance)::bigint from public.profiles where role = 'child' and archived_at is null and (select ok from check_admin)), 0),
    coalesce((select sum(cash_amount) from public.transactions where type = 'cash_payout' and (select ok from check_admin)), 0::numeric),
    (select count(*)::int from public.waitlist where (select ok from check_admin));
$$;

grant execute on function public.admin_stats_overview() to authenticated;


-- ─── 6. admin_recent_signups ───────────────────────────────────────────
-- Регистрации семей по дням за последние 14 дней
create or replace function public.admin_recent_signups()
returns table (
  day date,
  families_count int,
  waitlist_count int
)
language sql
stable
security definer
set search_path = public
as $$
  with check_admin as (select public.is_current_user_admin() as ok),
  days as (
    select (current_date - i)::date as day
    from generate_series(0, 13) i
  ),
  fams as (
    select created_at::date as day, count(*)::int as n
    from public.families
    where created_at > current_date - interval '14 days'
    group by created_at::date
  ),
  waits as (
    select created_at::date as day, count(*)::int as n
    from public.waitlist
    where created_at > current_date - interval '14 days'
    group by created_at::date
  )
  select
    d.day,
    coalesce(f.n, 0),
    coalesce(w.n, 0)
  from days d
  left join fams f on f.day = d.day
  left join waits w on w.day = d.day
  where (select ok from check_admin)
  order by d.day desc;
$$;

grant execute on function public.admin_recent_signups() to authenticated;
