-- ========================================================================
-- pip — Sprint 2 migration (005)
-- Атомарное завершение задачи ребёнком:
--   - вставляет task_completion
--   - если задача не требует подтверждения → ставит auto_approved + начисляет монеты
--   - всё в одной транзакции с блокировкой профиля (FOR UPDATE)
-- ========================================================================

create or replace function public.complete_task_atomic(
  p_task_id uuid,
  p_profile_id uuid,
  p_scheduled_for date,
  p_idempotency_key text default null
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
  -- 1. Берём задачу с блокировкой
  select * into v_task
  from public.tasks
  where id = p_task_id and archived_at is null
  for share;

  if not found then
    raise exception 'Задача не найдена или архивирована';
  end if;

  -- 2. Проверяем что ребёнок назначен на эту задачу
  if not (p_profile_id = any (v_task.assigned_to)) then
    raise exception 'Ребёнок не назначен на эту задачу';
  end if;

  -- 3. Берём профиль ребёнка с блокировкой (для безопасного апдейта баланса)
  select id, family_id, balance into v_profile
  from public.profiles
  where id = p_profile_id and role = 'child' and family_id = v_task.family_id
  for update;

  if not found then
    raise exception 'Профиль ребёнка не найден';
  end if;

  -- 4. Проверяем что нет уже completion для этой задачи + ребёнка + дня
  --    (одна задача = одно выполнение в день)
  select * into v_existing_completion
  from public.task_completions
  where task_id = p_task_id
    and profile_id = p_profile_id
    and scheduled_for = p_scheduled_for
    and status in ('pending', 'approved', 'auto_approved')
  limit 1;

  if found then
    -- Идемпотентность: уже есть запись, возвращаем её
    return query
    select
      v_existing_completion.id,
      v_existing_completion.status,
      coalesce(v_existing_completion.awarded_coins, 0),
      v_profile.balance;
    return;
  end if;

  -- 5. Определяем статус: если задача не требует ручного аппрува → auto_approved
  if v_task.requires_approval then
    v_status := 'pending';
    v_awarded := 0;
    v_new_balance := v_profile.balance;
  else
    v_status := 'auto_approved';
    v_awarded := v_task.coin_value;
    v_new_balance := v_profile.balance + v_awarded;
  end if;

  -- 6. Вставляем task_completion
  insert into public.task_completions (
    task_id, profile_id, status, scheduled_for,
    awarded_coins, approved_at, idempotency_key
  )
  values (
    p_task_id, p_profile_id, v_status, p_scheduled_for,
    v_awarded,
    case when v_status = 'auto_approved' then now() else null end,
    p_idempotency_key
  )
  returning id into v_completion_id;

  -- 7. Если auto_approved → создаём транзакцию (триггер обновит profiles.balance)
  if v_status = 'auto_approved' then
    -- Нужен parent_id для created_by (children не имеют user_id)
    -- Берём любого родителя семьи
    select id into v_parent_id
    from public.profiles
    where family_id = v_profile.family_id and role = 'parent'
    limit 1;

    if v_parent_id is null then
      raise exception 'Не найден родитель семьи';
    end if;

    insert into public.transactions (
      profile_id, type, amount, balance_after,
      reason, related_task_completion_id, created_by
    )
    values (
      p_profile_id, 'task_reward', v_awarded, v_new_balance,
      v_task.title, v_completion_id, v_parent_id
    );
  end if;

  return query
  select v_completion_id, v_status, v_awarded, v_new_balance;
end;
$$;

-- Разрешаем вызов из authenticated (родитель действует за ребёнка)
grant execute on function public.complete_task_atomic(uuid, uuid, date, text) to authenticated;
