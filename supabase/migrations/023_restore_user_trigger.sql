-- 023: восстановление триггера создания семьи/профиля при регистрации.
--
-- На self-hosted БД триггер on_auth_user_created (auth.users → public.handle_new_user)
-- оказался отсутствующим (сама функция handle_new_user есть). Из-за этого любая
-- новая регистрация (email/пароль и OAuth/Яндекс) создавала auth.users БЕЗ семьи и
-- профиля → /parent уводил на /, а / (для авторизованного) обратно на /parent →
-- бесконечный редирект (ERR_TOO_MANY_REDIRECTS). Восстанавливаем триггер и
-- бэкафиллим уже зарегистрированных пользователей без профиля.

-- 1. Триггер (идемпотентно)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Бэкафилл осиротевших пользователей (нет профиля) — та же логика, что в handle_new_user
do $$
declare u record; fid uuid; pid uuid; uname text;
begin
  for u in
    select id, email, raw_user_meta_data rm
    from auth.users uu
    where not exists (select 1 from public.profiles p where p.user_id = uu.id)
  loop
    uname := coalesce(u.rm->>'name', split_part(u.email, '@', 1));
    insert into public.families (name, locale, timezone)
      values (
        coalesce(u.rm->>'family_name', 'Моя семья'),
        coalesce(u.rm->>'locale', 'ru'),
        coalesce(u.rm->>'timezone', 'Europe/Moscow')
      )
      returning id into fid;
    insert into public.profiles (family_id, user_id, role, name, avatar_color)
      values (fid, u.id, 'parent', uname, 'ink')
      returning id into pid;
    perform public.seed_starter_content(fid, pid);
    raise notice 'backfilled profile for %', u.email;
  end loop;
end $$;
