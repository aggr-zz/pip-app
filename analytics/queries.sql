-- PIP — аналитика активации/удержания поверх существующих таблиц.
-- Запуск:  ~/.ssh/pipsel 'docker exec -i supabase-db psql -U postgres -d postgres -f -' < analytics/queries.sql
-- Или на сервере: docker exec -i supabase-db psql -U postgres -d postgres -P pager=off -f /opt/pip-analytics/queries.sql
-- Всё read-only. Считаем ПО СЕМЬЯМ (COUNT DISTINCT family_id) — так видно, где семьи отваливаются.

\echo '\n=== 1. Воронка активации (по семьям) ==='
with
kids as (select distinct family_id from profiles where role='child' and archived_at is null),
assigned as (select distinct family_id from tasks where archived_at is null and coalesce(array_length(assigned_to,1),0) > 0),
completed as (select distinct p.family_id from task_completions tc join profiles p on p.id=tc.profile_id),
approved as (select distinct p.family_id from task_completions tc join profiles p on p.id=tc.profile_id where tc.status in ('approved','auto_approved')),
ordered as (select distinct p.family_id from reward_orders ro join profiles p on p.id=ro.profile_id)
select
  (select count(*) from families)  as "1_семей",
  (select count(*) from kids)      as "2_добавили_ребёнка",
  (select count(*) from assigned)  as "3_есть_задание",
  (select count(*) from completed) as "4_ребёнок_выполнил",
  (select count(*) from approved)  as "5_одобрено",
  (select count(*) from ordered)   as "6_заказал_награду";

\echo '\n=== 2. Поимённый разбор: где застряла каждая семья ==='
select
  f.name as "семья",
  to_char(f.created_at, 'DD.MM') as "рег",
  count(distinct pc.id) filter (where pc.role='child' and pc.archived_at is null) as "детей",
  count(distinct t.id) filter (where t.archived_at is null and coalesce(array_length(t.assigned_to,1),0)>0) as "задан.",
  count(distinct tc.id) as "выполн.",
  count(distinct tc.id) filter (where tc.status in ('approved','auto_approved')) as "одобр.",
  count(distinct ro.id) as "наград"
from families f
left join profiles pc on pc.family_id = f.id
left join tasks t on t.family_id = f.id
left join profiles ch on ch.family_id = f.id and ch.role='child'
left join task_completions tc on tc.profile_id = ch.id
left join reward_orders ro on ro.profile_id = ch.id
group by f.id, f.name, f.created_at
order by f.created_at;

\echo '\n=== 3. Активность за последние 7 дней ==='
select
  (select count(*) from task_completions where completed_at > now() - interval '7 days') as "выполнений_7д",
  (select count(*) from task_completions where completed_at > now() - interval '7 days' and status in ('approved','auto_approved')) as "одобрено_7д",
  (select count(*) from reward_orders where created_at > now() - interval '7 days') as "наград_7д",
  (select count(distinct p.family_id) from task_completions tc join profiles p on p.id=tc.profile_id where tc.completed_at > now() - interval '7 days') as "активных_семей_7д";

\echo '\n=== 4. Вовлечённость по детям ==='
select
  p.name as "ребёнок",
  p.balance as "баланс",
  p.current_streak as "стрик",
  count(tc.id) as "выполнено_всего",
  count(tc.id) filter (where tc.completed_at > now() - interval '7 days') as "за_7д"
from profiles p
left join task_completions tc on tc.profile_id = p.id
where p.role='child' and p.archived_at is null
group by p.id, p.name, p.balance, p.current_streak
order by count(tc.id) desc;
