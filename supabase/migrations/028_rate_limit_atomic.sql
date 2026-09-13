-- 028: атомарная проверка+запись попытки для лимитера PIN.
--
-- Проблема. Сейчас вход ребёнка делает два вызова подряд:
--   1) rate_limit_check  — действует ли лок;
--   2) rate_limit_fail   — зафиксировать попытку.
-- Каждый атомарен сам по себе, но между ними есть окно: пачка параллельных
-- запросов целиком проходит шаг 1 (лока ещё нет) и только потом инкрементирует
-- счётчик. То есть за один «заход» атакующий получает столько попыток, какова
-- его параллельность, а не одну. Для 4-значного PIN (10000 комбинаций) это
-- сокращает перебор с суток до часов.
--
-- Решение. Один вызов, который под блокировкой строки и проверяет лок, и
-- увеличивает счётчик. Параллельные запросы по одному ключу выстраиваются в
-- очередь, и каждый видит результат предыдущего.
--
-- Прежние rate_limit_check/fail/clear НЕ трогаем: на rate_limit_fail завязан
-- ещё и троттлинг писем в email-hook.

create or replace function public.rate_limit_hit(
  p_key text, p_max int, p_lock_seconds int, p_window_seconds int
)
returns int
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_now    timestamptz := now();
  v_row    public.auth_rate_limits%rowtype;
  v_fails  int;
  v_locked timestamptz;
begin
  -- Строка должна существовать, иначе FOR UPDATE нечего блокировать и гонка
  -- вернётся на этапе первой попытки.
  insert into public.auth_rate_limits(key, fails, window_start)
  values (p_key, 0, v_now)
  on conflict (key) do nothing;

  select * into v_row from public.auth_rate_limits
   where key = p_key
     for update;   -- сериализует параллельные попытки по этому ключу

  -- Лок уже действует: счётчик не трогаем, иначе шквал запросов продлевал бы
  -- блокировку бесконечно и ребёнок не смог бы войти даже после её истечения.
  if v_row.locked_until is not null and v_row.locked_until > v_now then
    return greatest(0, ceil(extract(epoch from (v_row.locked_until - v_now))))::int;
  end if;

  if v_row.window_start < v_now - make_interval(secs => p_window_seconds) then
    v_fails := 1;
    update public.auth_rate_limits
       set fails = 1, window_start = v_now, locked_until = null
     where key = p_key;
  else
    v_fails := v_row.fails + 1;
    update public.auth_rate_limits
       set fails = v_fails, locked_until = null
     where key = p_key;
  end if;

  if v_fails >= p_max then
    update public.auth_rate_limits
       set locked_until = v_now + make_interval(secs => p_lock_seconds),
           fails = 0, window_start = v_now
     where key = p_key
     returning locked_until into v_locked;
    return greatest(0, ceil(extract(epoch from (v_locked - v_now))))::int;
  end if;

  return 0;
end;
$$;

-- Только service_role: иначе anon/authenticated могли бы лочить чужие ключи.
-- revoke from public не снимает грант, который Supabase выдаёт ролям через
-- ALTER DEFAULT PRIVILEGES — отзываем явно.
revoke all on function public.rate_limit_hit(text,int,int,int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text,int,int,int) to service_role;
