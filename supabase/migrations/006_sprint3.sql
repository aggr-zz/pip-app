-- ========================================================================
-- pip — Sprint 3 migration (006)
-- Подтверждения родителем + фото-доказательства + автодоаппрув.
--
-- Что добавляется:
--   1. complete_task_atomic — обновляется, теперь принимает photo_path
--   2. approve_task_completion — атомарный аппрув (transaction + статус)
--   3. reject_task_completion — атомарный реджект (без транзакции)
--   4. auto_approve_pending_completions — массовый автоаппрув по таймеру
--   5. Storage-бакет task-photos + RLS-политики
-- ========================================================================


-- ─── 1. complete_task_atomic — обновлённая версия с photo_path ─────────
-- Старую функцию сначала дропаем (сигнатура меняется).
drop function if exists public.complete_task_atomic(uuid, uuid, date, text);

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
  -- 1. Задача с блокировкой
  select * into v_task
  from public.tasks
  where id = p_task_id and archived_at is null
  for share;

  if not found then
    raise exception 'Задача не найдена или архивирована';
  end if;

  -- 2. Проверяем что задача назначена этому ребёнку
  if not (p_profile_id = any (v_task.assigned_to)) then
    raise exception 'Ребёнок не назначен на эту задачу';
  end if;

  -- 3. Если задача требует фото, оно должно быть передано
  if v_task.requires_photo and (p_photo_path is null or p_photo_path = '') then
    raise exception 'Эта задача требует фото-доказательства';
  end if;

  -- 4. Профиль ребёнка
  select id, family_id, balance into v_profile
  from public.profiles
  where id = p_profile_id and role = 'child' and family_id = v_task.family_id
  for update;

  if not found then
    raise exception 'Профиль ребёнка не найден';
  end if;

  -- 5. Идемпотентность: уже есть выполнение?
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

  -- 6. Определяем статус
  if v_task.requires_approval then
    v_status := 'pending';
    v_awarded := 0;
    v_new_balance := v_profile.balance;
  else
    v_status := 'auto_approved';
    v_awarded := v_task.coin_value;
    v_new_balance := v_profile.balance + v_awarded;
  end if;

  -- 7. Вставляем completion
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

  -- 8. Если auto_approved → транзакция (триггер обновит баланс)
  if v_status = 'auto_approved' then
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

grant execute on function public.complete_task_atomic(uuid, uuid, date, text, text) to authenticated;


-- ─── 2. approve_task_completion ────────────────────────────────────────
-- Родитель подтверждает выполнение. Создаёт транзакцию, обновляет статус.
-- p_awarded:
--   - null → начислить полную сумму task.coin_value
--   - число → начислить указанную сумму (например, половина за неполное выполнение)
--
-- Возвращает photo_path чтобы вызывающий код мог удалить фото из Storage.

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
  -- Берём текущего пользователя (должен быть родителем семьи)
  select id into v_parent_id
  from public.profiles
  where user_id = auth.uid() and role = 'parent'
  limit 1;

  if v_parent_id is null then
    raise exception 'Только родитель может подтверждать выполнение';
  end if;

  -- Берём completion с блокировкой
  select * into v_completion
  from public.task_completions
  where id = p_completion_id
  for update;

  if not found then
    raise exception 'Подтверждение не найдено';
  end if;

  if v_completion.status != 'pending' then
    -- Идемпотентность: возвращаем что есть
    return query
    select
      coalesce(v_completion.awarded_coins, 0),
      (select balance from public.profiles where id = v_completion.profile_id),
      v_completion.photo_path;
    return;
  end if;

  -- Задача
  select * into v_task
  from public.tasks
  where id = v_completion.task_id;

  if not found then
    raise exception 'Связанная задача не найдена';
  end if;

  -- Профиль ребёнка с блокировкой баланса
  select id, family_id, balance into v_profile
  from public.profiles
  where id = v_completion.profile_id
  for update;

  if v_profile.family_id != (
    select family_id from public.profiles where id = v_parent_id
  ) then
    raise exception 'Чужая семья';
  end if;

  -- Сумма к начислению
  v_awarded_final := coalesce(p_awarded, v_task.coin_value);

  if v_awarded_final < 0 or v_awarded_final > v_task.coin_value then
    raise exception 'Сумма должна быть от 0 до %', v_task.coin_value;
  end if;

  v_new_balance := v_profile.balance + v_awarded_final;

  -- Обновляем completion
  update public.task_completions
  set
    status = 'approved',
    awarded_coins = v_awarded_final,
    approved_at = now(),
    approved_by = v_parent_id
  where id = p_completion_id;

  -- Транзакция (если есть монеты)
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

  return query
  select v_awarded_final, v_new_balance, v_completion.photo_path;
end;
$$;

grant execute on function public.approve_task_completion(uuid, int) to authenticated;


-- ─── 3. reject_task_completion ─────────────────────────────────────────
create or replace function public.reject_task_completion(
  p_completion_id uuid,
  p_reason text
)
returns table (
  photo_path text
)
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
  from public.profiles
  where user_id = auth.uid() and role = 'parent'
  limit 1;

  if v_parent_id is null then
    raise exception 'Только родитель может отклонять выполнение';
  end if;

  select * into v_completion
  from public.task_completions
  where id = p_completion_id
  for update;

  if not found then
    raise exception 'Подтверждение не найдено';
  end if;

  if v_completion.status != 'pending' then
    -- Идемпотентность
    return query select v_completion.photo_path;
    return;
  end if;

  select family_id into v_child_family
  from public.profiles where id = v_completion.profile_id;

  if v_child_family != v_parent_family then
    raise exception 'Чужая семья';
  end if;

  update public.task_completions
  set
    status = 'rejected',
    rejection_reason = p_reason,
    approved_at = now(),
    approved_by = v_parent_id
  where id = p_completion_id;

  return query select v_completion.photo_path;
end;
$$;

grant execute on function public.reject_task_completion(uuid, text) to authenticated;


-- ─── 4. auto_approve_pending_completions ───────────────────────────────
-- Находит pending выполнения старше families.auto_approve_hours и аппрувит их.
-- Вызывается лениво при заходе родителя на /parent/approvals.

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
begin
  -- Проверяем что текущий пользователь — родитель этой семьи
  select id, family_id into v_parent_id, v_completion.profile_id
  from public.profiles
  where user_id = auth.uid()
    and role = 'parent'
    and family_id = p_family_id
  limit 1;

  if v_parent_id is null then
    return 0;
  end if;

  -- Берём настройку семьи
  select auto_approve_hours into v_auto_hours
  from public.families where id = p_family_id;

  if v_auto_hours is null or v_auto_hours = 0 then
    -- Семья отключила автоаппрув
    return 0;
  end if;

  -- Для каждого pending старше порога — аппрувим
  for v_completion in
    select tc.*
    from public.task_completions tc
    join public.profiles p on p.id = tc.profile_id
    where p.family_id = p_family_id
      and tc.status = 'pending'
      and tc.completed_at < now() - (v_auto_hours || ' hours')::interval
    order by tc.completed_at
  loop
    -- Задача
    select * into v_task from public.tasks where id = v_completion.task_id;
    if not found then continue; end if;

    -- Профиль с блокировкой
    select * into v_profile from public.profiles where id = v_completion.profile_id for update;

    v_new_balance := v_profile.balance + v_task.coin_value;

    -- Обновляем completion
    update public.task_completions
    set
      status = 'auto_approved',
      awarded_coins = v_task.coin_value,
      approved_at = now()
    where id = v_completion.id;

    -- Транзакция
    insert into public.transactions (
      profile_id, type, amount, balance_after,
      reason, related_task_completion_id, created_by
    )
    values (
      v_completion.profile_id, 'task_reward', v_task.coin_value, v_new_balance,
      v_task.title || ' (авто)', v_completion.id, v_parent_id
    );

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

grant execute on function public.auto_approve_pending_completions(uuid) to authenticated;


-- ─── 5. Storage bucket task-photos ─────────────────────────────────────
-- Приватный бакет для фото-доказательств.
-- Путь: {family_id}/{uuid}.{ext}
-- Удаляются после approve/reject.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-photos',
  'task-photos',
  false,                                              -- приватный
  5242880,                                            -- 5 MB лимит
  array['image/jpeg', 'image/png', 'image/webp']      -- только эти типы
)
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = excluded.public;


-- Политика INSERT: член семьи может загружать в свою папку
drop policy if exists "Family members upload task photos" on storage.objects;
create policy "Family members upload task photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = public.current_user_family_id()::text
  );

-- Политика SELECT: член семьи может читать свои фото
drop policy if exists "Family members read task photos" on storage.objects;
create policy "Family members read task photos"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = public.current_user_family_id()::text
  );

-- Политика DELETE: член семьи может удалять свои фото
-- (используется после approve/reject из server action)
drop policy if exists "Family members delete task photos" on storage.objects;
create policy "Family members delete task photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = public.current_user_family_id()::text
  );
