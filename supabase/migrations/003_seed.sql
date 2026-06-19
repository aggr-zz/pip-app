-- ========================================================================
-- pip — seed data (migration 003, опционально)
-- Тестовые данные для разработки. НЕ запускать на проде.
-- ========================================================================

-- Чтобы это работало, нужно:
-- 1. Сначала вручную зарегистрировать пользователя в Supabase Auth
--    (через UI приложения или Dashboard → Authentication → Users → Add user)
-- 2. Взять его user_id и family_id из созданного triggerом профиля
-- 3. Подставить ниже как :user_id и :family_id (или раскомментировать и заполнить руками)

/*
-- Пример наполнения для семьи Петровых:

-- Допустим, family_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
-- parent profile_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

-- Добавим детей
insert into public.profiles (id, family_id, role, name, birth_year, avatar_color, balance)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Маша', 2016, 'coral', 245),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'child', 'Артём', 2012, 'mint', 890);

-- Несколько задач
insert into public.tasks (family_id, title, icon, coin_value, schedule_type, requires_approval, assigned_to, created_by)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Почистить зубы утром', 'hygiene', 5, 'daily', false,
    array['cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid],
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Заправить кровать', 'bedroom', 5, 'daily', false,
    array['cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid],
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Сделать домашку', 'school', 20, 'weekdays', true,
    array['cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid],
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Вынести мусор', 'trash', 10, 'custom', false,
    array['dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid],
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Награды
insert into public.rewards (family_id, title, icon, coin_cost)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Выбор фильма на вечер', '🎬', 50),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Мороженое', '🍦', 100),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Час экранного времени', '📱', 300),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Карманные деньги', '💵', 500),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Велосипед BMX', '🚲', 5000);
*/

-- Пара записей в waitlist для проверки лендинга
insert into public.waitlist (email, name, source) values
  ('test1@example.com', 'Тест Первый', 'manual_seed'),
  ('test2@example.com', 'Тест Второй', 'manual_seed')
on conflict (email) do nothing;
