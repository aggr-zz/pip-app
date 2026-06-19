-- ========================================================================
-- pip — Migration 015
-- Стартовый контент для новых семей: 3 задания + 3 награды.
-- Применяется автоматически при регистрации через handle_new_user.
-- ========================================================================

-- ─── 1. Функция сидинга ─────────────────────────────────────────────────────

create or replace function public.seed_starter_content(
  p_family_id        uuid,
  p_parent_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Стартовые задания (assigned_to = {} — не назначены; родитель назначит детям)
  insert into public.tasks (family_id, title, icon, coin_value, schedule_type, requires_approval, requires_photo, assigned_to, created_by)
  values
    (p_family_id, 'Уборка комнаты',  'bedroom',  10, 'daily', false, false, '{}', p_parent_profile_id),
    (p_family_id, 'Почистить зубы',  'teeth',     5, 'daily', false, false, '{}', p_parent_profile_id),
    (p_family_id, 'Сделать домашку', 'homework', 15, 'daily', false, false, '{}', p_parent_profile_id);

  -- Стартовые награды (available_to = null — доступны всем детям семьи)
  insert into public.rewards (family_id, title, description, icon, coin_cost, limit_type)
  values
    (p_family_id, 'Вывод 500 руб.',   'Родитель переведёт деньги на карту', '💰', 100, 'unlimited'),
    (p_family_id, 'Выбрать кино',     'Ты выбираешь фильм на вечер',        '🎬',  50, 'unlimited'),
    (p_family_id, 'Внезапный подарок','Сюрприз от родителей — что-то крутое!','🎁', 75, 'unlimited');
end;
$$;

-- ─── 2. Обновлённый handle_new_user — вызывает seed_starter_content ─────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_family_id       uuid;
  new_parent_id       uuid;
  user_name           text;
begin
  user_name := coalesce(
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- 1. Создаём семью
  insert into public.families (name, locale, timezone)
  values (
    coalesce(new.raw_user_meta_data->>'family_name', 'Моя семья'),
    coalesce(new.raw_user_meta_data->>'locale', 'ru'),
    coalesce(new.raw_user_meta_data->>'timezone', 'Europe/Moscow')
  )
  returning id into new_family_id;

  -- 2. Создаём профиль родителя, сохраняем его id
  insert into public.profiles (family_id, user_id, role, name, avatar_color)
  values (new_family_id, new.id, 'parent', user_name, 'ink')
  returning id into new_parent_id;

  -- 3. Сидим стартовый контент
  perform public.seed_starter_content(new_family_id, new_parent_id);

  return new;
end;
$$;
