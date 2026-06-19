-- ========================================================================
-- pip — Sprint 5 migration (008)
-- Учёт выданных наличных + помощник для статистики.
--
-- Концепция: pip — игровая валюта внутри. Реальные деньги передаются
-- ВНЕ приложения. Эта функция только фиксирует факт обмена pip на ₽
-- (или другую валюту) в журнале транзакций.
-- ========================================================================


-- ─── record_cash_payout ────────────────────────────────────────────────
-- Родитель отметил: «я выдал ребёнку N рублей в обмен на M pip».
-- Атомарно списывает pip с баланса ребёнка и пишет cash_amount.
--
-- p_pip_amount — сколько pip списать (положительное число)
-- p_cash_amount — сколько денег выдано (положительное число)
-- p_currency — ISO 4217, дефолт RUB
-- p_reason — опциональный комментарий («карманные на неделю»)

create or replace function public.record_cash_payout(
  p_profile_id uuid,
  p_pip_amount int,
  p_cash_amount numeric,
  p_currency text default 'RUB',
  p_reason text default null
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
  -- Проверка прав
  select id, family_id into v_parent_id, v_parent_family
  from public.profiles
  where user_id = auth.uid() and role = 'parent'
  limit 1;

  if v_parent_id is null then
    raise exception 'Только родитель может оформлять выдачу';
  end if;

  -- Валидация входа
  if p_pip_amount is null or p_pip_amount <= 0 then
    raise exception 'Списываемые pip должны быть положительными';
  end if;
  if p_cash_amount is null or p_cash_amount <= 0 then
    raise exception 'Сумма к выдаче должна быть положительной';
  end if;
  if p_currency is null or p_currency !~ '^[A-Z]{3}$' then
    raise exception 'Валюта в формате ISO 4217 (например, RUB, USD)';
  end if;

  -- Профиль ребёнка с блокировкой
  select id, family_id, balance into v_profile
  from public.profiles
  where id = p_profile_id and role = 'child' and family_id = v_parent_family
  for update;

  if not found then
    raise exception 'Профиль ребёнка не найден или из другой семьи';
  end if;

  -- Хватает ли монет
  if v_profile.balance < p_pip_amount then
    raise exception 'Не хватает монет: нужно %, есть %', p_pip_amount, v_profile.balance;
  end if;

  v_new_balance := v_profile.balance - p_pip_amount;

  insert into public.transactions (
    profile_id, type, amount, balance_after,
    cash_amount, currency, reason, created_by
  )
  values (
    p_profile_id, 'cash_payout', -p_pip_amount, v_new_balance,
    p_cash_amount, p_currency, p_reason, v_parent_id
  )
  returning id into v_tx_id;

  return query
  select v_tx_id, v_new_balance;
end;
$$;

grant execute on function public.record_cash_payout(uuid, int, numeric, text, text) to authenticated;


-- ─── family_stats ──────────────────────────────────────────────────────
-- Сводная статистика семьи за период.
-- Возвращает агрегаты по каждому ребёнку, для рендера на /parent/stats.

create or replace function public.family_stats(
  p_family_id uuid,
  p_since timestamptz
)
returns table (
  profile_id uuid,
  profile_name text,
  avatar_color text,
  current_balance int,
  tasks_completed int,
  coins_earned int,
  coins_spent int,
  cash_paid_out numeric,
  currency text
)
language sql
stable
security definer
set search_path = public
as $$
  with my_family as (
    select id from public.profiles
    where user_id = auth.uid() and family_id = p_family_id and role = 'parent'
    limit 1
  ),
  family_children as (
    select id, name, avatar_color, balance
    from public.profiles
    where family_id = p_family_id and role = 'child' and archived_at is null
  ),
  task_counts as (
    select
      tc.profile_id,
      count(*) filter (where tc.status in ('approved', 'auto_approved')) as completed
    from public.task_completions tc
    join family_children c on c.id = tc.profile_id
    where tc.completed_at >= p_since
    group by tc.profile_id
  ),
  earnings as (
    select
      t.profile_id,
      sum(t.amount) filter (where t.amount > 0) as earned,
      sum(-t.amount) filter (where t.amount < 0 and t.type != 'cash_payout') as spent_non_cash,
      sum(t.cash_amount) filter (where t.type = 'cash_payout') as cash_out
    from public.transactions t
    join family_children c on c.id = t.profile_id
    where t.created_at >= p_since
    group by t.profile_id
  )
  select
    c.id,
    c.name,
    c.avatar_color,
    c.balance,
    coalesce(tc.completed, 0)::int,
    coalesce(e.earned, 0)::int,
    coalesce(e.spent_non_cash, 0)::int,
    coalesce(e.cash_out, 0::numeric),
    'RUB'::text
  from family_children c
  left join task_counts tc on tc.profile_id = c.id
  left join earnings e on e.profile_id = c.id
  where exists (select 1 from my_family)
  order by c.name;
$$;

grant execute on function public.family_stats(uuid, timestamptz) to authenticated;


-- ─── top_tasks ─────────────────────────────────────────────────────────
-- Топ-5 задач по числу выполнений за период.

create or replace function public.top_tasks(
  p_family_id uuid,
  p_since timestamptz
)
returns table (
  task_id uuid,
  title text,
  icon text,
  completions int,
  total_earned int
)
language sql
stable
security definer
set search_path = public
as $$
  with my_family as (
    select id from public.profiles
    where user_id = auth.uid() and family_id = p_family_id and role = 'parent'
    limit 1
  )
  select
    t.id,
    t.title,
    t.icon,
    count(tc.id)::int as completions,
    coalesce(sum(tc.awarded_coins), 0)::int as total_earned
  from public.tasks t
  join public.task_completions tc on tc.task_id = t.id
  where t.family_id = p_family_id
    and tc.completed_at >= p_since
    and tc.status in ('approved', 'auto_approved')
    and exists (select 1 from my_family)
  group by t.id, t.title, t.icon
  order by count(tc.id) desc, total_earned desc
  limit 5;
$$;

grant execute on function public.top_tasks(uuid, timestamptz) to authenticated;
