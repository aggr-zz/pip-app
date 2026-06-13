-- ========================================================================
-- pip — migration 021
-- Фикс гонки двойного начисления в auto_approve_pending_completions.
--
-- Проблема (code review):
--   Свип читал pending-заявки БЕЗ блокировки строки (только профиль
--   блокировался FOR UPDATE). Ручной approve_task_completion блокирует
--   саму заявку FOR UPDATE. Если свип (на загрузке /parent/approvals)
--   и ручное «Подтвердить» шли одновременно, обе видели status='pending'
--   и обе вставляли transaction → двойное начисление, баланс и леджер
--   расходятся.
--
-- Фикс:
--   1. Внутри цикла блокируем саму заявку (SELECT ... FOR UPDATE по id)
--      и заново проверяем status='pending' — это сериализует свип с
--      ручным аппрувом (тот тоже берёт FOR UPDATE на заявке).
--   2. Чиним опечатку `select id, family_id into v_parent_id,
--      v_completion.profile_id` (писала family_id в чужое поле record'а).
-- ========================================================================

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
  v_row record;       -- строка курсора (только id)
  v_completion record; -- заблокированная заявка
  v_task record;
  v_profile record;
  v_parent_id uuid;
  v_auto_hours int;
  v_new_balance int;
begin
  -- Текущий пользователь должен быть родителем этой семьи
  select id into v_parent_id
  from public.profiles
  where user_id = auth.uid()
    and role = 'parent'
    and family_id = p_family_id
  limit 1;

  if v_parent_id is null then
    return 0;
  end if;

  -- Настройка автоаппрува семьи
  select auto_approve_hours into v_auto_hours
  from public.families where id = p_family_id;

  if v_auto_hours is null or v_auto_hours = 0 then
    return 0;
  end if;

  -- Кандидаты: pending старше порога. Берём только id — заявку
  -- перечитываем с блокировкой внутри цикла.
  for v_row in
    select tc.id
    from public.task_completions tc
    join public.profiles p on p.id = tc.profile_id
    where p.family_id = p_family_id
      and tc.status = 'pending'
      and tc.completed_at < now() - (v_auto_hours || ' hours')::interval
    order by tc.completed_at
  loop
    -- Блокируем саму заявку и перепроверяем статус — защита от гонки
    -- с ручным approve_task_completion (он тоже берёт FOR UPDATE).
    select * into v_completion
    from public.task_completions
    where id = v_row.id
    for update;

    if not found or v_completion.status != 'pending' then
      continue; -- уже обработана параллельно
    end if;

    select * into v_task from public.tasks where id = v_completion.task_id;
    if not found then continue; end if;

    -- Профиль с блокировкой баланса
    select * into v_profile from public.profiles where id = v_completion.profile_id for update;

    v_new_balance := v_profile.balance + v_task.coin_value;

    update public.task_completions
    set status = 'auto_approved',
        awarded_coins = v_task.coin_value,
        approved_at = now()
    where id = v_completion.id;

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
