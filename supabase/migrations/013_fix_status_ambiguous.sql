-- ========================================================================
-- pip — Migration 013
-- Фикс: column reference "status" is ambiguous в complete_task_atomic.
--
-- Проблема: в returns table(...) объявлена колонка "status", что конфликтует
-- с колонкой "status" таблицы task_completions в WHERE-условии.
-- Решение: явно указываем task_completions.status.
-- ========================================================================

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

  -- FIX: явно указываем task_completions.status вместо просто status
  -- чтобы избежать ambiguity с returns table(status text)
  select * into v_existing_completion
  from public.task_completions
  where task_id = p_task_id
    and profile_id = p_profile_id
    and scheduled_for = p_scheduled_for
    and task_completions.status in ('pending', 'approved', 'auto_approved')
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
