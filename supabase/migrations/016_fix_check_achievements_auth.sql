-- ========================================================================
-- pip — Migration 016: fix check_achievements for service_role callers
--
-- Когда ребёнок заходит по прямой ссылке (pip_child_direct cookie),
-- server action использует createAdminClient (service_role key).
-- При вызове через service_role auth.uid() = null, и предыдущая проверка
-- прав доступа в check_achievements выбрасывала исключение.
--
-- Решение: пропускаем auth-проверку если auth.uid() = null
-- (service_role сам по себе является достаточным credentials).
-- ========================================================================

create or replace function public.check_achievements(p_profile_id uuid)
returns table (newly_unlocked text[])
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed int := 0;
  v_total_earned bigint := 0;
  v_current_streak int := 0;
  v_orders int := 0;
  v_unlocked text[] := '{}';
  v_just text;
begin
  -- Защита: вызывающий должен быть из той же семьи, что и ребёнок.
  -- Пропускаем проверку для service_role (auth.uid() = null) — он уже trusted.
  if auth.uid() is not null and not exists (
    select 1 from public.profiles p1
    join public.profiles p2 on p2.family_id = p1.family_id
    where p2.id = p_profile_id
      and p1.user_id = auth.uid()
  ) then
    raise exception 'Нет доступа к этому профилю';
  end if;

  -- Собираем счётчики
  select
    count(*) filter (where status in ('approved', 'auto_approved')),
    coalesce(sum(awarded_coins) filter (where status in ('approved', 'auto_approved')), 0)
  into v_completed, v_total_earned
  from public.task_completions
  where profile_id = p_profile_id;

  select current_streak into v_current_streak
  from public.profiles where id = p_profile_id;

  select count(*) into v_orders
  from public.reward_orders
  where profile_id = p_profile_id and status = 'fulfilled';

  -- first_task
  if v_completed >= 1 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'first_task')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  -- tasks_10
  if v_completed >= 10 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'tasks_10')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  -- tasks_50
  if v_completed >= 50 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'tasks_50')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  -- tasks_100
  if v_completed >= 100 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'tasks_100')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  -- coins_100
  if v_total_earned >= 100 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'coins_100')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  -- coins_500
  if v_total_earned >= 500 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'coins_500')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  -- coins_1000
  if v_total_earned >= 1000 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'coins_1000')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  -- streak_3
  if v_current_streak >= 3 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'streak_3')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  -- streak_7
  if v_current_streak >= 7 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'streak_7')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  -- streak_30
  if v_current_streak >= 30 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'streak_30')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  -- first_reward
  if v_orders >= 1 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'first_reward')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  return query select v_unlocked;
end;
$$;

grant execute on function public.check_achievements(uuid) to authenticated;
