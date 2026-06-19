-- 022 — Релиз 2: rate-limit (H7/M22), снимок цены задачи (M21), запрет прямого
-- INSERT в transactions (M20). Применяется через CREATE OR REPLACE — без DROP,
-- без простоя.

-- ════════════════════════════════════════════════════════════════════════════
-- H7/M22 — общий счётчик лимитов (PIN-вход, отправка писем) в БД
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.auth_rate_limits (
  key          text primary key,
  fails        int not null default 0,
  window_start timestamptz not null default now(),
  locked_until timestamptz
);

alter table public.auth_rate_limits enable row level security;
-- Политик нет: доступ только через SECURITY DEFINER функции (как postgres).

-- Сколько секунд осталось до разблокировки (0 — не заблокирован).
create or replace function public.rate_limit_check(p_key text)
returns int
language sql
security definer
set search_path to 'public'
as $$
  select coalesce(
    (select greatest(0, ceil(extract(epoch from (locked_until - now()))))::int
       from public.auth_rate_limits
      where key = p_key and locked_until is not null and locked_until > now()),
    0);
$$;

-- Зафиксировать «использование/неудачу». При достижении p_max — лок на
-- p_lock_seconds. Возвращает секунды до разблокировки (0 — ещё не заблокирован).
create or replace function public.rate_limit_fail(
  p_key text, p_max int, p_lock_seconds int, p_window_seconds int
)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_now    timestamptz := now();
  v_fails  int;
  v_locked timestamptz;
begin
  insert into public.auth_rate_limits(key, fails, window_start)
  values (p_key, 1, v_now)
  on conflict (key) do update set
    fails = case
      when auth_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
      then 1 else auth_rate_limits.fails + 1 end,
    window_start = case
      when auth_rate_limits.window_start < v_now - make_interval(secs => p_window_seconds)
      then v_now else auth_rate_limits.window_start end
  returning fails into v_fails;

  if v_fails >= p_max then
    update public.auth_rate_limits
       set locked_until = v_now + make_interval(secs => p_lock_seconds),
           fails = 0, window_start = v_now
     where key = p_key
     returning locked_until into v_locked;
    return greatest(0, ceil(extract(epoch from (v_locked - v_now))))::int;
  end if;
  return 0;
end;
$$;

create or replace function public.rate_limit_clear(p_key text)
returns void
language sql
security definer
set search_path to 'public'
as $$
  delete from public.auth_rate_limits where key = p_key;
$$;

-- Только service_role (admin-клиент приложения) может дёргать лимитер — иначе
-- anon/authenticated могли бы гриферски лочить чужие ключи ИЛИ сбрасывать свой
-- лок (rate_limit_clear), обходя защиту от перебора PIN.
-- ВАЖНО: revoke from public НЕ снимает грант, который Supabase выдаёт ролям
-- anon/authenticated через ALTER DEFAULT PRIVILEGES — поэтому отзываем явно.
revoke all on function public.rate_limit_check(text)            from public, anon, authenticated;
revoke all on function public.rate_limit_fail(text,int,int,int) from public, anon, authenticated;
revoke all on function public.rate_limit_clear(text)            from public, anon, authenticated;
grant execute on function public.rate_limit_check(text)            to service_role;
grant execute on function public.rate_limit_fail(text,int,int,int) to service_role;
grant execute on function public.rate_limit_clear(text)            to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- M20 — запрет прямого INSERT в transactions из клиентских ролей.
-- Все записи идут через SECURITY DEFINER RPC (они владельцем postgres обходят
-- RLS). Политика «Parents create transactions» позволяла родителю вставить
-- произвольный balance_after — закрываем.
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "Parents create transactions" on public.transactions;

-- ════════════════════════════════════════════════════════════════════════════
-- M21 — снимок цены задачи на момент выполнения.
-- Раньше начисление считалось по ТЕКУЩЕЙ tasks.coin_value на момент аппрува;
-- если родитель менял цену между выполнением и подтверждением — начислялось не
-- то, что ребёнок видел. Фиксируем coin_value в task_completions и начисляем по
-- нему (включая клампинг p_awarded).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.task_completions
  add column if not exists coin_value_snapshot integer;

-- complete_task_atomic — пишем снимок при создании/переотправке заявки.
create or replace function public.complete_task_atomic(
  p_task_id uuid, p_profile_id uuid, p_scheduled_for date,
  p_idempotency_key text default null::text, p_photo_path text default null::text
)
returns table(completion_id uuid, status text, awarded integer, new_balance integer)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_task record;
  v_profile record;
  v_parent_id uuid;
  v_existing_completion record;
  v_new_balance int;
  v_status text;
  v_awarded int;
  v_completion_id uuid;
begin
  select * into v_task
  from public.tasks
  where id = p_task_id and archived_at is null
  for share;

  if not found then raise exception 'Задача не найдена или архивирована'; end if;
  if not (p_profile_id = any (v_task.assigned_to)) then
    raise exception 'Ребёнок не назначен на эту задачу';
  end if;
  if v_task.requires_photo and (p_photo_path is null or p_photo_path = '') then
    raise exception 'Эта задача требует фото-доказательства';
  end if;

  select id, family_id, balance into v_profile
  from public.profiles
  where id = p_profile_id and role = 'child' and family_id = v_task.family_id
  for update;

  if not found then raise exception 'Профиль ребёнка не найден'; end if;

  -- Idempotency: уже есть pending/approved → вернуть
  select * into v_existing_completion
  from public.task_completions
  where task_id = p_task_id
    and profile_id = p_profile_id
    and scheduled_for = p_scheduled_for
    and task_completions.status in ('pending', 'approved', 'auto_approved')
  limit 1;

  if found then
    return query select
      v_existing_completion.id,
      v_existing_completion.status,
      coalesce(v_existing_completion.awarded_coins, 0),
      v_profile.balance;
    return;
  end if;

  if v_task.requires_approval then
    v_status  := 'pending';
    v_awarded := 0;
    v_new_balance := v_profile.balance;
  else
    v_status  := 'auto_approved';
    v_awarded := v_task.coin_value;
    v_new_balance := v_profile.balance + v_awarded;
  end if;

  -- Повторная отправка после reject → UPDATE вместо INSERT
  select * into v_existing_completion
  from public.task_completions
  where task_id = p_task_id
    and profile_id = p_profile_id
    and scheduled_for = p_scheduled_for
    and task_completions.status = 'rejected'
  order by created_at desc
  limit 1;

  if found then
    update public.task_completions
    set status = v_status, photo_path = p_photo_path,
        awarded_coins = v_awarded,
        coin_value_snapshot = v_task.coin_value,
        approved_at = case when v_status = 'auto_approved' then now() else null end,
        rejection_reason = null, completed_at = now()
    where id = v_existing_completion.id;

    v_completion_id := v_existing_completion.id;

    if v_status = 'auto_approved' then
      update public.profiles set balance = v_new_balance where id = p_profile_id;
      select id into v_parent_id from public.profiles
        where family_id = v_profile.family_id and role = 'parent' limit 1;
      if v_parent_id is null then raise exception 'Не найден родитель семьи'; end if;
      insert into public.transactions (profile_id, type, amount, balance_after, reason, related_task_completion_id, created_by)
        values (p_profile_id, 'task_reward', v_awarded, v_new_balance, v_task.title, v_completion_id, v_parent_id);
      perform public.update_streak_for_child(p_profile_id);
    end if;

    return query select v_completion_id, v_status, v_awarded, v_new_balance;
    return;
  end if;

  -- Первая отправка — свежий INSERT
  insert into public.task_completions (task_id, profile_id, status, scheduled_for, awarded_coins, coin_value_snapshot, approved_at, idempotency_key, photo_path)
  values (p_task_id, p_profile_id, v_status, p_scheduled_for, v_awarded, v_task.coin_value,
    case when v_status = 'auto_approved' then now() else null end, p_idempotency_key, p_photo_path)
  returning id into v_completion_id;

  if v_status = 'auto_approved' then
    update public.profiles set balance = v_new_balance where id = p_profile_id;
    select id into v_parent_id from public.profiles
      where family_id = v_profile.family_id and role = 'parent' limit 1;
    if v_parent_id is null then raise exception 'Не найден родитель семьи'; end if;
    insert into public.transactions (profile_id, type, amount, balance_after, reason, related_task_completion_id, created_by)
      values (p_profile_id, 'task_reward', v_awarded, v_new_balance, v_task.title, v_completion_id, v_parent_id);
    perform public.update_streak_for_child(p_profile_id);
  end if;

  return query select v_completion_id, v_status, v_awarded, v_new_balance;
end;
$function$;

-- approve_task_completion — дефолт и ВЕРХНЯЯ граница берутся из снимка.
create or replace function public.approve_task_completion(
  p_completion_id uuid, p_awarded integer default null::integer
)
returns table(awarded integer, new_balance integer, photo_path text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_completion record;
  v_task record;
  v_profile record;
  v_parent_id uuid;
  v_awarded_final int;
  v_ceiling int;
  v_new_balance int;
begin
  select id into v_parent_id
  from public.profiles
  where user_id = auth.uid() and role = 'parent'
  limit 1;

  if v_parent_id is null then raise exception 'Только родитель может подтверждать'; end if;

  select * into v_completion from public.task_completions where id = p_completion_id for update;

  if not found then raise exception 'Подтверждение не найдено'; end if;

  if v_completion.status != 'pending' then
    return query
    select
      coalesce(v_completion.awarded_coins, 0),
      (select balance from public.profiles where id = v_completion.profile_id),
      v_completion.photo_path;
    return;
  end if;

  select * into v_task from public.tasks where id = v_completion.task_id;
  if not found then raise exception 'Связанная задача не найдена'; end if;

  select id, family_id, balance into v_profile
  from public.profiles where id = v_completion.profile_id for update;

  if v_profile.family_id != (
    select family_id from public.profiles where id = v_parent_id
  ) then raise exception 'Чужая семья'; end if;

  -- Цена на момент выполнения (снимок), иначе текущая.
  v_ceiling := coalesce(v_completion.coin_value_snapshot, v_task.coin_value);
  v_awarded_final := coalesce(p_awarded, v_ceiling);

  if v_awarded_final < 0 or v_awarded_final > v_ceiling then
    raise exception 'Сумма должна быть от 0 до %', v_ceiling;
  end if;

  v_new_balance := v_profile.balance + v_awarded_final;

  update public.task_completions
  set status = 'approved', awarded_coins = v_awarded_final,
      approved_at = now(), approved_by = v_parent_id
  where id = p_completion_id;

  if v_awarded_final > 0 then
    insert into public.transactions (
      profile_id, type, amount, balance_after,
      reason, related_task_completion_id, created_by
    )
    values (
      v_completion.profile_id, 'task_reward', v_awarded_final, v_new_balance,
      v_task.title, p_completion_id, v_parent_id
    );
  end if;

  perform public.update_streak_for_child(v_completion.profile_id);

  return query select v_awarded_final, v_new_balance, v_completion.photo_path;
end;
$function$;

-- auto_approve_pending_completions — начисляем по снимку цены.
create or replace function public.auto_approve_pending_completions(p_family_id uuid)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_count int := 0;
  v_row record;
  v_completion record;
  v_task record;
  v_profile record;
  v_parent_id uuid;
  v_auto_hours int;
  v_award int;
  v_new_balance int;
begin
  select id into v_parent_id
  from public.profiles
  where user_id = auth.uid()
    and role = 'parent'
    and family_id = p_family_id
  limit 1;

  if v_parent_id is null then
    return 0;
  end if;

  select auto_approve_hours into v_auto_hours
  from public.families where id = p_family_id;

  if v_auto_hours is null or v_auto_hours = 0 then
    return 0;
  end if;

  for v_row in
    select tc.id
    from public.task_completions tc
    join public.profiles p on p.id = tc.profile_id
    where p.family_id = p_family_id
      and tc.status = 'pending'
      and tc.completed_at < now() - (v_auto_hours || ' hours')::interval
    order by tc.completed_at
  loop
    select * into v_completion
    from public.task_completions
    where id = v_row.id
    for update;

    if not found or v_completion.status != 'pending' then
      continue;
    end if;

    select * into v_task from public.tasks where id = v_completion.task_id;
    if not found then continue; end if;

    select * into v_profile from public.profiles where id = v_completion.profile_id for update;

    v_award := coalesce(v_completion.coin_value_snapshot, v_task.coin_value);
    v_new_balance := v_profile.balance + v_award;

    update public.task_completions
    set status = 'auto_approved',
        awarded_coins = v_award,
        approved_at = now()
    where id = v_completion.id;

    insert into public.transactions (
      profile_id, type, amount, balance_after,
      reason, related_task_completion_id, created_by
    )
    values (
      v_completion.profile_id, 'task_reward', v_award, v_new_balance,
      v_task.title || ' (авто)', v_completion.id, v_parent_id
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;
