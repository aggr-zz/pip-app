-- ========================================================================
-- pip — Sprint 7 migration (011): achievements
-- Бейджи за прогресс. Ребёнок получает их автоматически после выполнения
-- задач, достижения стриков, накопления pip и получения наград.
-- ========================================================================


-- ─── 1. Таблица achievements ─────────────────────────────────────────
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  unlocked_at timestamptz not null default now(),
  unique (profile_id, type)
);

create index if not exists achievements_profile_idx
  on public.achievements (profile_id, unlocked_at desc);

alter table public.achievements enable row level security;

-- RLS: семья видит свои достижения, админы видят все
drop policy if exists "Family sees achievements" on public.achievements;
create policy "Family sees achievements"
  on public.achievements for select
  to authenticated
  using (
    profile_id in (
      select id from public.profiles where family_id = public.current_user_family_id()
    )
    or public.is_current_user_admin()
  );

-- INSERT только через SECURITY DEFINER функцию check_achievements
-- (политику не добавляем — нет анонимных insert-ов)


-- ─── 2. check_achievements ────────────────────────────────────────────
-- Проверяет состояние и разлочивает все ещё-не-полученные бейджи.
-- Возвращает массив только что разблокированных типов (для UI-уведомлений).
--
-- Вызывается из server actions после:
--   - markTaskComplete (через RPC)
--   - approveCompletion (через RPC)
--   - fulfillOrder (через RPC)
--
-- Идемпотентна: повторный вызов без новых событий вернёт пустой массив.

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
  -- Защита: вызывающий должен быть родителем семьи этого ребёнка
  -- или сам этот ребёнок (если когда-нибудь дети получат auth)
  if not exists (
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

  -- Helper-функция как inline-блок: try insert и если новый — добавить в массив
  -- К сожалению PL/pgSQL не умеет красиво вынести это в подфункцию,
  -- так что повторяющиеся блоки.

  if v_completed >= 1 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'first_task')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  if v_completed >= 10 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'tasks_10')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  if v_completed >= 50 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'tasks_50')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  if v_completed >= 100 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'tasks_100')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  if v_total_earned >= 100 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'coins_100')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  if v_total_earned >= 500 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'coins_500')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  if v_total_earned >= 1000 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'coins_1000')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  if v_current_streak >= 3 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'streak_3')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  if v_current_streak >= 7 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'streak_7')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

  if v_current_streak >= 30 then
    insert into public.achievements (profile_id, type)
    values (p_profile_id, 'streak_30')
    on conflict (profile_id, type) do nothing
    returning type into v_just;
    if v_just is not null then v_unlocked := array_append(v_unlocked, v_just); v_just := null; end if;
  end if;

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


-- ─── 3. Backfill — раздать существующим профилям заслуженные бейджи ───
-- При деплое на прод с существующими данными — пройтись по всем детям и
-- проставить уже заработанные ачивки. Идемпотентно благодаря ON CONFLICT.
do $$
declare
  v_child record;
  v_completed int;
  v_earned bigint;
  v_streak int;
  v_orders int;
begin
  for v_child in
    select id from public.profiles where role = 'child' and archived_at is null
  loop
    select
      count(*) filter (where status in ('approved', 'auto_approved')),
      coalesce(sum(awarded_coins) filter (where status in ('approved', 'auto_approved')), 0)
    into v_completed, v_earned
    from public.task_completions
    where profile_id = v_child.id;

    select current_streak into v_streak
    from public.profiles where id = v_child.id;

    select count(*) into v_orders
    from public.reward_orders
    where profile_id = v_child.id and status = 'fulfilled';

    if v_completed >= 1 then
      insert into public.achievements (profile_id, type) values (v_child.id, 'first_task')
      on conflict do nothing;
    end if;
    if v_completed >= 10 then
      insert into public.achievements (profile_id, type) values (v_child.id, 'tasks_10')
      on conflict do nothing;
    end if;
    if v_completed >= 50 then
      insert into public.achievements (profile_id, type) values (v_child.id, 'tasks_50')
      on conflict do nothing;
    end if;
    if v_completed >= 100 then
      insert into public.achievements (profile_id, type) values (v_child.id, 'tasks_100')
      on conflict do nothing;
    end if;
    if v_earned >= 100 then
      insert into public.achievements (profile_id, type) values (v_child.id, 'coins_100')
      on conflict do nothing;
    end if;
    if v_earned >= 500 then
      insert into public.achievements (profile_id, type) values (v_child.id, 'coins_500')
      on conflict do nothing;
    end if;
    if v_earned >= 1000 then
      insert into public.achievements (profile_id, type) values (v_child.id, 'coins_1000')
      on conflict do nothing;
    end if;
    if v_streak >= 3 then
      insert into public.achievements (profile_id, type) values (v_child.id, 'streak_3')
      on conflict do nothing;
    end if;
    if v_streak >= 7 then
      insert into public.achievements (profile_id, type) values (v_child.id, 'streak_7')
      on conflict do nothing;
    end if;
    if v_streak >= 30 then
      insert into public.achievements (profile_id, type) values (v_child.id, 'streak_30')
      on conflict do nothing;
    end if;
    if v_orders >= 1 then
      insert into public.achievements (profile_id, type) values (v_child.id, 'first_reward')
      on conflict do nothing;
    end if;
  end loop;
end$$;


-- ─── 4. Realtime для achievements (стретч) ─────────────────────────────
-- Чтобы /child/[id]/achievements обновлялся в реалтайме когда падает бейдж
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'achievements'
  ) then
    alter publication supabase_realtime add table public.achievements;
  end if;
exception when others then
  raise notice 'Realtime publication for achievements: %', sqlerrm;
end$$;
