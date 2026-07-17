-- 025: удаление аккаунта родителя (требование App Store 5.1.1(v) — удаление ИЗНУТРИ приложения,
-- а также базовая гигиена приватности детских данных).
--
-- Почему функция, а не просто delete from families:
-- часть внешних ключей объявлена NO ACTION и НЕ обнуляема (tasks.created_by,
-- transactions.created_by, family_invites.created_by, invite_codes.created_by → profiles).
-- Наивный каскад от families падает с FK-нарушением, т.к. порядок удаления в каскаде
-- не гарантирует, что ссылающиеся строки уйдут раньше профилей. Поэтому удаляем явно,
-- от листьев к корню, одной транзакцией.
--
-- Два сценария:
--   • единственный родитель  → сносим семью целиком (все дети и их данные);
--   • есть со-родитель       → удаляем только свой профиль, аудит-ссылки переводим
--                              на оставшегося родителя (иначе NOT NULL FK не даст удалить).
-- Файлы Storage (avatars/task-photos) удаляются в приложении ДО вызова этой функции —
-- из SQL к Storage API доступа нет.

create or replace function public.delete_parent_account(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id  uuid;
  v_family_id   uuid;
  v_other_parent uuid;
  v_parents_cnt int;
begin
  select id, family_id into v_profile_id, v_family_id
  from public.profiles
  where user_id = p_user_id and role = 'parent';

  if v_profile_id is null then
    return jsonb_build_object('ok', false, 'error', 'parent profile not found');
  end if;

  select count(*) into v_parents_cnt
  from public.profiles
  where family_id = v_family_id and role = 'parent' and archived_at is null;

  if v_parents_cnt > 1 then
    -- ── Есть со-родитель: удаляем только себя, семью сохраняем ──────────────
    select id into v_other_parent
    from public.profiles
    where family_id = v_family_id and role = 'parent' and id <> v_profile_id
      and archived_at is null
    order by created_at
    limit 1;

    -- Обнуляемые аудит-ссылки
    update public.task_completions set approved_by = null where approved_by = v_profile_id;
    update public.reward_orders    set fulfilled_by = null where fulfilled_by = v_profile_id;
    update public.family_invites   set used_by = null where used_by = v_profile_id;
    update public.invite_codes     set pre_filled_profile_id = null where pre_filled_profile_id = v_profile_id;

    -- NOT NULL аудит-ссылки → переводим на оставшегося родителя
    update public.tasks          set created_by = v_other_parent where created_by = v_profile_id;
    update public.transactions   set created_by = v_other_parent where created_by = v_profile_id;
    update public.family_invites set created_by = v_other_parent where created_by = v_profile_id;
    update public.invite_codes   set created_by = v_other_parent where created_by = v_profile_id;

    -- Согласие на данные детей переходит к оставшемуся законному представителю.
    -- Без этого FK (on delete set null) молча обнулил бы parental_consent_by, и
    -- осталось бы «когда» без «кто» — та самая половина, которую миграция 026
    -- объявила недостаточной для доказательства согласия (App Store 5.1.4).
    update public.profiles
      set parental_consent_by = v_other_parent
      where parental_consent_by = v_profile_id and family_id = v_family_id;

    delete from public.push_subscriptions where profile_id = v_profile_id;
    delete from public.profiles where id = v_profile_id;

    return jsonb_build_object('ok', true, 'mode', 'profile_only', 'family_id', v_family_id);
  end if;

  -- ── Единственный родитель: сносим всю семью, от листьев к корню ──────────
  -- Страховка: семью нельзя сносить, пока в ней есть ЛЮБОЙ другой родительский
  -- профиль (в т.ч. архивный). Счётчик выше фильтрует archived_at, а этот профиль
  -- выбирался без такого фильтра — при появлении архивации родителей асимметрия
  -- молча превратила бы «удалить себя» в «удалить всю семью».
  if exists (
    select 1 from public.profiles
    where family_id = v_family_id and role = 'parent' and id <> v_profile_id
  ) then
    raise exception 'refusing to delete family %: another parent profile exists', v_family_id;
  end if;

  delete from public.transactions
    where profile_id in (select id from public.profiles where family_id = v_family_id)
       or created_by  in (select id from public.profiles where family_id = v_family_id);

  delete from public.task_completions
    where profile_id in (select id from public.profiles where family_id = v_family_id)
       or task_id    in (select id from public.tasks    where family_id = v_family_id);

  delete from public.reward_goals
    where child_id  in (select id from public.profiles where family_id = v_family_id)
       or reward_id in (select id from public.rewards  where family_id = v_family_id);

  delete from public.reward_orders
    where profile_id in (select id from public.profiles where family_id = v_family_id)
       or reward_id  in (select id from public.rewards  where family_id = v_family_id);

  delete from public.achievements
    where profile_id in (select id from public.profiles where family_id = v_family_id);

  delete from public.push_subscriptions
    where profile_id in (select id from public.profiles where family_id = v_family_id);

  -- Лимиты PIN — строго по детям ЭТОЙ семьи (ключи вида pin:<childId>:<ip> и pin-global:<childId>).
  delete from public.auth_rate_limits a
    using public.profiles p
    where p.family_id = v_family_id
      and (a.key = 'pin-global:' || p.id::text or a.key like 'pin:' || p.id::text || ':%');

  -- Троттлинг писем хранит ключ 'email:<адрес>' в открытом виде и не имеет TTL —
  -- после удаления аккаунта адрес не должен оставаться в БД.
  delete from public.auth_rate_limits
    where key = 'email:' || lower((select email from auth.users where id = p_user_id));

  delete from public.family_invites where family_id = v_family_id;
  delete from public.invite_codes   where family_id = v_family_id;
  delete from public.tasks          where family_id = v_family_id;
  delete from public.rewards        where family_id = v_family_id;
  delete from public.profiles       where family_id = v_family_id;
  delete from public.families       where id = v_family_id;

  return jsonb_build_object('ok', true, 'mode', 'family_deleted', 'family_id', v_family_id);
end;
$$;

revoke all on function public.delete_parent_account(uuid) from public, anon, authenticated;
grant execute on function public.delete_parent_account(uuid) to service_role;
