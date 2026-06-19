-- ========================================================================
-- pip — Sprint 4 migration (007)
-- Каталог наград + магазин для ребёнка + выдача родителем.
--
-- Что добавляется:
--   1. order_reward_atomic — атомарный заказ (списание монет)
--   2. fulfill_reward_order — родитель отметил «выдал»
--   3. cancel_reward_order — родитель отменил, монеты возвращаются
-- ========================================================================


-- ─── 1. order_reward_atomic ────────────────────────────────────────────
-- Ребёнок заказывает награду. Атомарно проверяет баланс, лимиты, создаёт
-- заказ и транзакцию.
--
-- Проверки:
--   - награда не архивирована
--   - награда доступна этому ребёнку (если задано available_to)
--   - у ребёнка хватает монет
--   - для limit_type='once': награда ещё не заказана этим ребёнком

create or replace function public.order_reward_atomic(
  p_reward_id uuid,
  p_profile_id uuid
)
returns table (
  order_id uuid,
  cost int,
  new_balance int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward record;
  v_profile record;
  v_parent_id uuid;
  v_new_balance int;
  v_order_id uuid;
begin
  -- 1. Награда
  select * into v_reward
  from public.rewards
  where id = p_reward_id and archived_at is null
  for share;

  if not found then
    raise exception 'Награда не найдена или архивирована';
  end if;

  -- 2. Доступность конкретному ребёнку
  if v_reward.available_to is not null
     and array_length(v_reward.available_to, 1) > 0
     and not (p_profile_id = any (v_reward.available_to)) then
    raise exception 'Эта награда не для тебя';
  end if;

  -- 3. Профиль с блокировкой баланса
  select * into v_profile
  from public.profiles
  where id = p_profile_id and role = 'child' and family_id = v_reward.family_id
  for update;

  if not found then
    raise exception 'Профиль ребёнка не найден';
  end if;

  -- 4. Хватает ли монет
  if v_profile.balance < v_reward.coin_cost then
    raise exception 'Не хватает монет: нужно %, есть %', v_reward.coin_cost, v_profile.balance;
  end if;

  -- 5. Лимит "once" — не было ли уже заказа
  if v_reward.limit_type = 'once' then
    if exists (
      select 1 from public.reward_orders
      where reward_id = p_reward_id
        and profile_id = p_profile_id
        and status in ('pending', 'fulfilled')
    ) then
      raise exception 'Эту награду можно получить только один раз';
    end if;
  end if;

  -- TODO Sprint 7: limit_type weekly/monthly с подсчётом по времени

  v_new_balance := v_profile.balance - v_reward.coin_cost;

  -- 6. Создаём заказ
  insert into public.reward_orders (
    reward_id, profile_id, status, coin_cost_at_order
  )
  values (
    p_reward_id, p_profile_id, 'pending', v_reward.coin_cost
  )
  returning id into v_order_id;

  -- 7. Берём parent_id для transaction.created_by (children без user_id)
  select id into v_parent_id
  from public.profiles
  where family_id = v_profile.family_id and role = 'parent'
  limit 1;

  if v_parent_id is null then
    raise exception 'Не найден родитель семьи';
  end if;

  -- 8. Транзакция -coins (триггер обновит profiles.balance)
  insert into public.transactions (
    profile_id, type, amount, balance_after,
    reason, related_reward_order_id, created_by
  )
  values (
    p_profile_id, 'reward_purchase', -v_reward.coin_cost, v_new_balance,
    v_reward.title, v_order_id, v_parent_id
  );

  return query select v_order_id, v_reward.coin_cost, v_new_balance;
end;
$$;

grant execute on function public.order_reward_atomic(uuid, uuid) to authenticated;


-- ─── 2. fulfill_reward_order ───────────────────────────────────────────
-- Родитель отметил, что выдал награду в реальной жизни.
-- Монеты уже списаны при заказе, тут просто меняем статус.

create or replace function public.fulfill_reward_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_parent_id uuid;
  v_parent_family uuid;
  v_child_family uuid;
begin
  select id, family_id into v_parent_id, v_parent_family
  from public.profiles
  where user_id = auth.uid() and role = 'parent'
  limit 1;

  if v_parent_id is null then
    raise exception 'Только родитель';
  end if;

  select * into v_order from public.reward_orders where id = p_order_id for update;

  if not found then
    raise exception 'Заказ не найден';
  end if;

  -- Идемпотентность
  if v_order.status != 'pending' then return; end if;

  select family_id into v_child_family
  from public.profiles where id = v_order.profile_id;

  if v_child_family != v_parent_family then
    raise exception 'Чужая семья';
  end if;

  update public.reward_orders
  set status = 'fulfilled',
      fulfilled_at = now(),
      fulfilled_by = v_parent_id
  where id = p_order_id;
end;
$$;

grant execute on function public.fulfill_reward_order(uuid) to authenticated;


-- ─── 3. cancel_reward_order ────────────────────────────────────────────
-- Родитель отменяет заказ. Монеты возвращаются ребёнку через refund-транзакцию.

create or replace function public.cancel_reward_order(
  p_order_id uuid,
  p_reason text
)
returns table (
  refunded int,
  new_balance int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_parent_id uuid;
  v_parent_family uuid;
  v_profile record;
  v_new_balance int;
begin
  select id, family_id into v_parent_id, v_parent_family
  from public.profiles
  where user_id = auth.uid() and role = 'parent'
  limit 1;

  if v_parent_id is null then
    raise exception 'Только родитель';
  end if;

  select * into v_order from public.reward_orders where id = p_order_id for update;

  if not found then
    raise exception 'Заказ не найден';
  end if;

  if v_order.status != 'pending' then
    raise exception 'Отменить можно только pending заказ';
  end if;

  -- Профиль с блокировкой
  select * into v_profile from public.profiles where id = v_order.profile_id for update;

  if v_profile.family_id != v_parent_family then
    raise exception 'Чужая семья';
  end if;

  v_new_balance := v_profile.balance + v_order.coin_cost_at_order;

  update public.reward_orders
  set status = 'cancelled',
      cancellation_reason = p_reason,
      fulfilled_at = now(),
      fulfilled_by = v_parent_id
  where id = p_order_id;

  -- Возврат монет
  insert into public.transactions (
    profile_id, type, amount, balance_after,
    reason, related_reward_order_id, created_by
  )
  values (
    v_order.profile_id, 'refund', v_order.coin_cost_at_order, v_new_balance,
    coalesce(p_reason, 'Возврат: заказ отменён'), v_order.id, v_parent_id
  );

  return query select v_order.coin_cost_at_order, v_new_balance;
end;
$$;

grant execute on function public.cancel_reward_order(uuid, text) to authenticated;
