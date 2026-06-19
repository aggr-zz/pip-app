-- ========================================================================
-- pip — Sprint 7 migration (010)
-- Стрики: подсчёт и автообновление при изменении статусов выполнений.
--
-- Бизнес-логика стрика:
--   - День = дата по таймзоне семьи
--   - День «зачитывается», если в нём ≥1 выполнение со статусом approved/auto_approved
--   - Стрик = подряд идущие дни с зачитанным днём, начиная с самого свежего
--   - Если последний зачитанный день старше «вчера» — стрик = 0 (сломан)
-- ========================================================================


-- ─── 1. compute_child_streak ───────────────────────────────────────────
-- Чистая read-only функция, считает стрик ребёнка с нуля.

create or replace function public.compute_child_streak(p_profile_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_family_tz text;
  v_today date;
  v_yesterday date;
  v_dates date[];
  v_streak int := 0;
  v_check_date date;
  i int;
begin
  -- Таймзона семьи
  select f.timezone into v_family_tz
  from public.profiles p
  join public.families f on f.id = p.family_id
  where p.id = p_profile_id;

  v_family_tz := coalesce(v_family_tz, 'Europe/Moscow');
  v_today := (now() at time zone v_family_tz)::date;
  v_yesterday := v_today - 1;

  -- Все уникальные даты выполнений (по таймзоне семьи), новейшие сверху
  select array_agg(d order by d desc) into v_dates
  from (
    select distinct (tc.completed_at at time zone v_family_tz)::date as d
    from public.task_completions tc
    where tc.profile_id = p_profile_id
      and tc.status in ('approved', 'auto_approved')
  ) sub;

  if v_dates is null or array_length(v_dates, 1) = 0 then
    return 0;
  end if;

  -- Самая свежая дата должна быть сегодня или вчера
  if v_dates[1] < v_yesterday then
    return 0;
  end if;

  -- Считаем подряд идущие дни
  v_check_date := v_dates[1];
  v_streak := 1;

  for i in 2..array_length(v_dates, 1) loop
    if v_dates[i] = v_check_date - 1 then
      v_streak := v_streak + 1;
      v_check_date := v_dates[i];
    else
      exit; -- разрыв
    end if;
  end loop;

  return v_streak;
end;
$$;

grant execute on function public.compute_child_streak(uuid) to authenticated;


-- ─── 2. update_streak_for_child ────────────────────────────────────────
-- Записывает свежий стрик в profiles. Обновляет longest_streak если побит рекорд.

create or replace function public.update_streak_for_child(p_profile_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak int;
begin
  v_streak := public.compute_child_streak(p_profile_id);

  update public.profiles
  set current_streak = v_streak,
      longest_streak = greatest(longest_streak, v_streak)
  where id = p_profile_id;

  return v_streak;
end;
$$;

grant execute on function public.update_streak_for_child(uuid) to authenticated;


-- ─── 3. Хук в complete_task_atomic ─────────────────────────────────────
-- Пересоздаём с тем же телом + вызов update_streak_for_child в конце,
-- если completion статуса auto_approved.

drop function if exists public.complete_task_atomic(uuid, uuid, date, text, text);

create or replace function public.complete_task_atomic(
  p_task_id uuid,
  p_profile_id uuid,
  p_scheduled_for date,
  p_idempotency_key text default null,
  p_photo_path text default null
)
returns table (
  completion_id uuid,
  status text,
  awarded int,
  new_balance int
)
language plpgsql
security definer
set search_path = public
as $$
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

  select * into v_existing_completion
  from public.task_completions
  where task_id = p_task_id
    and profile_id = p_profile_id
    and scheduled_for = p_scheduled_for
    and status in ('pending', 'approved', 'auto_approved')
  limit 1;

  if found then
    return query
    select
      v_existing_completion.id,
      v_existing_completion.status,
      coalesce(v_existing_completion.awarded_coins, 0),
      v_profile.balance;
    return;
  end if;

  if v_task.requires_approval then
    v_status := 'pending';
    v_awarded := 0;
    v_new_balance := v_profile.balance;
  else
    v_status := 'auto_approved';
    v_awarded := v_task.coin_value;
    v_new_balance := v_profile.balance + v_awarded;
  end if;

  insert into public.task_completions (
    task_id, profile_id, status, scheduled_for,
    awarded_coins, approved_at, idempotency_key, photo_path
  )
  values (
    p_task_id, p_profile_id, v_status, p_scheduled_for,
    v_awarded,
    case when v_status = 'auto_approved' then now() else null end,
    p_idempotency_key,
    p_photo_path
  )
  returning id into v_completion_id;

  if v_status = 'auto_approved' then
    select id into v_parent_id
    from public.profiles
    where family_id = v_profile.family_id and role = 'parent'
    limit 1;

    if v_parent_id is null then raise exception 'Не найден родитель семьи'; end if;

    insert into public.transactions (
      profile_id, type, amount, balance_after,
      reason, related_task_completion_id, created_by
    )
    values (
      p_profile_id, 'task_reward', v_awarded, v_new_balance,
      v_task.title, v_completion_id, v_parent_id
    );

    -- Sprint 7: обновляем стрик после auto_approve
    perform public.update_streak_for_child(p_profile_id);
  end if;

  return query select v_completion_id, v_status, v_awarded, v_new_balance;
end;
$$;

grant execute on function public.complete_task_atomic(uuid, uuid, date, text, text) to authenticated;


-- ─── 4. Хук в approve_task_completion ──────────────────────────────────
create or replace function public.approve_task_completion(
  p_completion_id uuid,
  p_awarded int default null
)
returns table (
  awarded int,
  new_balance int,
  photo_path text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completion record;
  v_task record;
  v_profile record;
  v_parent_id uuid;
  v_awarded_final int;
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

  v_awarded_final := coalesce(p_awarded, v_task.coin_value);

  if v_awarded_final < 0 or v_awarded_final > v_task.coin_value then
    raise exception 'Сумма должна быть от 0 до %', v_task.coin_value;
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

  -- Sprint 7: обновляем стрик
  perform public.update_streak_for_child(v_completion.profile_id);

  return query select v_awarded_final, v_new_balance, v_completion.photo_path;
end;
$$;

grant execute on function public.approve_task_completion(uuid, int) to authenticated;


-- ─── 5. Хук в reject_task_completion ───────────────────────────────────
-- Реджект тоже может сломать стрик (если это было единственное выполнение в день)
create or replace function public.reject_task_completion(
  p_completion_id uuid,
  p_reason text
)
returns table (photo_path text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completion record;
  v_parent_id uuid;
  v_parent_family uuid;
  v_child_family uuid;
begin
  select id, family_id into v_parent_id, v_parent_family
  from public.profiles where user_id = auth.uid() and role = 'parent' limit 1;

  if v_parent_id is null then raise exception 'Только родитель может отклонять'; end if;

  select * into v_completion from public.task_completions where id = p_completion_id for update;
  if not found then raise exception 'Подтверждение не найдено'; end if;

  if v_completion.status != 'pending' then
    return query select v_completion.photo_path;
    return;
  end if;

  select family_id into v_child_family from public.profiles where id = v_completion.profile_id;
  if v_child_family != v_parent_family then raise exception 'Чужая семья'; end if;

  update public.task_completions
  set status = 'rejected', rejection_reason = p_reason,
      approved_at = now(), approved_by = v_parent_id
  where id = p_completion_id;

  -- Sprint 7: пересчитываем стрик (может упасть, если это было единственное выполнение в день)
  perform public.update_streak_for_child(v_completion.profile_id);

  return query select v_completion.photo_path;
end;
$$;

grant execute on function public.reject_task_completion(uuid, text) to authenticated;


-- ─── 6. Хук в auto_approve_pending_completions ─────────────────────────
create or replace function public.auto_approve_pending_completions(
  p_family_id uuid
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_completion record;
  v_task record;
  v_profile record;
  v_parent_id uuid;
  v_auto_hours int;
  v_new_balance int;
  v_affected_profiles uuid[];
begin
  select id into v_parent_id
  from public.profiles
  where user_id = auth.uid() and role = 'parent' and family_id = p_family_id
  limit 1;

  if v_parent_id is null then return 0; end if;

  select auto_approve_hours into v_auto_hours from public.families where id = p_family_id;
  if v_auto_hours is null or v_auto_hours = 0 then return 0; end if;

  v_affected_profiles := array[]::uuid[];

  for v_completion in
    select tc.* from public.task_completions tc
    join public.profiles p on p.id = tc.profile_id
    where p.family_id = p_family_id
      and tc.status = 'pending'
      and tc.completed_at < now() - (v_auto_hours || ' hours')::interval
    order by tc.completed_at
  loop
    select * into v_task from public.tasks where id = v_completion.task_id;
    if not found then continue; end if;

    select * into v_profile from public.profiles where id = v_completion.profile_id for update;
    v_new_balance := v_profile.balance + v_task.coin_value;

    update public.task_completions
    set status = 'auto_approved', awarded_coins = v_task.coin_value, approved_at = now()
    where id = v_completion.id;

    insert into public.transactions (
      profile_id, type, amount, balance_after,
      reason, related_task_completion_id, created_by
    )
    values (
      v_completion.profile_id, 'task_reward', v_task.coin_value, v_new_balance,
      v_task.title || ' (авто)', v_completion.id, v_parent_id
    );

    if not (v_completion.profile_id = any (v_affected_profiles)) then
      v_affected_profiles := array_append(v_affected_profiles, v_completion.profile_id);
    end if;

    v_count := v_count + 1;
  end loop;

  -- Sprint 7: обновляем стрики у всех затронутых детей
  if array_length(v_affected_profiles, 1) > 0 then
    for v_profile in select unnest(v_affected_profiles) as profile_id loop
      perform public.update_streak_for_child(v_profile.profile_id);
    end loop;
  end if;

  return v_count;
end;
$$;

grant execute on function public.auto_approve_pending_completions(uuid) to authenticated;


-- ─── 7. Включение Realtime ─────────────────────────────────────────────
-- Чтобы клиенты могли подписываться на изменения через Supabase Realtime,
-- надо добавить таблицы в публикацию supabase_realtime.

alter publication supabase_realtime add table public.task_completions;
alter publication supabase_realtime add table public.reward_orders;
alter publication supabase_realtime add table public.profiles;


-- ─── 8. Бэкфилл стриков ────────────────────────────────────────────────
-- Для уже существующих детей — пересчитать стрики с историей.
do $$
declare
  v_child record;
begin
  for v_child in select id from public.profiles where role = 'child' and archived_at is null
  loop
    perform public.update_streak_for_child(v_child.id);
  end loop;
end $$;
