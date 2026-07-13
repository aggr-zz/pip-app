-- 024: RPC воронки активации для админ-статистики (/admin/stats).
-- Считает ПО СЕМЬЯМ (count distinct family_id) на каждом шаге пути:
--   рег → добавили ребёнка → есть задание у ребёнка → ребёнок выполнил →
--   одобрено/начислено → заказал награду.
-- SECURITY DEFINER + внутренний гейт is_current_user_admin() (как admin_stats_overview).

create or replace function public.admin_activation_funnel()
returns table (
  registered      bigint,
  added_child     bigint,
  has_task        bigint,
  child_completed bigint,
  approved        bigint,
  ordered_reward  bigint
)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.families)::bigint,
    (select count(distinct family_id) from public.profiles
       where role='child' and archived_at is null)::bigint,
    (select count(distinct family_id) from public.tasks
       where archived_at is null and coalesce(array_length(assigned_to,1),0) > 0)::bigint,
    (select count(distinct p.family_id) from public.task_completions tc
       join public.profiles p on p.id=tc.profile_id)::bigint,
    (select count(distinct p.family_id) from public.task_completions tc
       join public.profiles p on p.id=tc.profile_id
       where tc.status in ('approved','auto_approved'))::bigint,
    (select count(distinct p.family_id) from public.reward_orders ro
       join public.profiles p on p.id=ro.profile_id)::bigint
  where public.is_current_user_admin();
$$;

revoke all on function public.admin_activation_funnel() from public;
grant execute on function public.admin_activation_funnel() to authenticated, service_role;
