-- ========================================================================
-- pip — Sprint 7 migration (012): manual_adjust_balance
-- Ручная корректировка баланса родителем — бонус или штраф.
-- Лимит ±500 pip за одну операцию (уже как CHECK constraint в 004_sprint1).
-- ========================================================================


create or replace function public.manual_adjust_balance(
  p_profile_id uuid,
  p_amount int,
  p_reason text
)
returns table (
  transaction_id uuid,
  new_balance int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid;
  v_parent_family uuid;
  v_profile record;
  v_new_balance int;
  v_tx_id uuid;
begin
  -- Только родитель
  select id, family_id into v_parent_id, v_parent_family
  from public.profiles
  where user_id = auth.uid() and role = 'parent'
  limit 1;

  if v_parent_id is null then
    raise exception 'Только родитель может корректировать баланс';
  end if;

  -- Валидация
  if p_amount is null or p_amount = 0 then
    raise exception 'Сумма должна быть отлична от нуля';
  end if;
  if abs(p_amount) > 500 then
    raise exception 'Лимит ручной корректировки — ±500 pip за операцию';
  end if;
  if p_reason is null or trim(p_reason) = '' then
    raise exception 'Укажи причину — ребёнок увидит её в истории';
  end if;
  if length(p_reason) > 200 then
    raise exception 'Причина слишком длинная (макс 200)';
  end if;

  -- Профиль ребёнка с блокировкой
  select id, family_id, balance into v_profile
  from public.profiles
  where id = p_profile_id and role = 'child' and family_id = v_parent_family
  for update;

  if not found then
    raise exception 'Профиль ребёнка не найден или из другой семьи';
  end if;

  v_new_balance := v_profile.balance + p_amount;

  -- Баланс не может уйти в минус (есть и триггер, но даём понятную ошибку)
  if v_new_balance < 0 then
    raise exception
      'Баланс уйдёт в минус: на балансе % pip, попытка списать %',
      v_profile.balance, abs(p_amount);
  end if;

  insert into public.transactions (
    profile_id, type, amount, balance_after, reason, created_by
  )
  values (
    p_profile_id, 'manual_adjustment', p_amount, v_new_balance, trim(p_reason), v_parent_id
  )
  returning id into v_tx_id;

  return query select v_tx_id, v_new_balance;
end;
$$;

grant execute on function public.manual_adjust_balance(uuid, int, text) to authenticated;
