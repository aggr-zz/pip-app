-- Push notification subscriptions
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  -- One subscription per endpoint per profile
  unique (profile_id, endpoint)
);

-- RLS
alter table push_subscriptions enable row level security;

-- Profiles can manage their own subscriptions
create policy "profile owns subscriptions"
  on push_subscriptions
  for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Service role (server) can read all to send pushes
create policy "service role can read all"
  on push_subscriptions
  for select
  using (auth.role() = 'service_role');
