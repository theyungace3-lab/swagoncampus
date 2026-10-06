-- SwagOnCampus analytics. Run after schema.sql in Supabase > SQL Editor.
-- Safe to re-run. Change the owner email in ONE place:
--   public.analytics_admin_email() below (it also honours app.admin_email).
begin;

-- Anonymous browser IDs, not names, emails, IP addresses, or full URLs.
create table if not exists public.analytics_events (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  visitor_id  text not null check (visitor_id ~ '^[a-zA-Z0-9_-]{8,64}$'),
  path        text not null default '/' check (char_length(path) <= 200 and path like '/%'),
  user_id     uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.analytics_events drop constraint if exists analytics_events_type_check;
alter table public.analytics_events add constraint analytics_events_type_check
  check (type in ('pageview', 'whatsapp_click', 'checkout_start', 'add_to_cart', 'heartbeat'));

create index if not exists analytics_events_created_idx
  on public.analytics_events (created_at desc);
create index if not exists analytics_events_type_created_idx
  on public.analytics_events (type, created_at desc);
create index if not exists analytics_events_visitor_idx
  on public.analytics_events (visitor_id, created_at desc);

-- Supports the all-time distinct-visitor counts via an index-only scan.
create index if not exists analytics_events_type_visitor_idx
  on public.analytics_events (type, visitor_id);

-- Only the validated server endpoint may write. Realtime SELECT is owner-only.
alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from public, anon, authenticated;
grant select on public.analytics_events to authenticated;
grant all on public.analytics_events to service_role;

-- Single source for the owner identity. Mirrors supabase/schema.sql's
-- app.admin_email setting and falls back to the store owner when unset, so the
-- email lives in exactly one place instead of three duplicated policy literals.
create or replace function public.analytics_admin_email()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('app.admin_email', true), ''), 'theyungace3@gmail.com')
$$;
revoke all on function public.analytics_admin_email() from public, anon;
grant execute on function public.analytics_admin_email() to authenticated, service_role;

drop policy if exists "analytics_events_public_insert" on public.analytics_events;
drop policy if exists "analytics_events_admin_read" on public.analytics_events;
create policy "analytics_events_admin_read" on public.analytics_events
  for select to authenticated
  using (lower((select auth.jwt()) ->> 'email') = lower(public.analytics_admin_email()));

-- Read-only policies let only the owner receive signup/order notifications.
drop policy if exists "profiles_analytics_admin_read" on public.profiles;
create policy "profiles_analytics_admin_read" on public.profiles
  for select to authenticated
  using (lower((select auth.jwt()) ->> 'email') = lower(public.analytics_admin_email()));
drop policy if exists "orders_analytics_admin_read" on public.orders;
create policy "orders_analytics_admin_read" on public.orders
  for select to authenticated
  using (lower((select auth.jwt()) ->> 'email') = lower(public.analytics_admin_email()));
grant select on public.profiles, public.orders to authenticated;

-- Polling remains available if Realtime is disabled in the project.
do $$
declare
  relation_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach relation_name in array array['analytics_events', 'profiles', 'orders'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = relation_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', relation_name);
      end if;
    end loop;
  end if;
end $$;

-- One server-only summary. Accounts come from auth.users, not client signup
-- events (which can be spoofed) or profiles that may not have been backfilled.
-- Each figure is its own sargable subquery so the (type, created_at) and
-- (type, visitor_id) indexes apply, instead of one full-scan aggregate.
create or replace function public.analytics_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'schemaVersion', 1,
    'generatedAt', now(),
    'visitors',       (select count(distinct visitor_id) from public.analytics_events where type = 'pageview'),
    'visitorsToday',  (select count(distinct visitor_id) from public.analytics_events where type = 'pageview' and created_at >= t.today_start),
    'visitorsLive',   (select count(distinct visitor_id) from public.analytics_events where created_at >= t.live_start),
    'pageviews',      (select count(*) from public.analytics_events where type = 'pageview'),
    'pageviewsToday', (select count(*) from public.analytics_events where type = 'pageview' and created_at >= t.today_start),
    'pageviewsLive',  (select count(*) from public.analytics_events where type = 'pageview' and created_at >= t.live_start),
    'accounts',       (select count(*) from auth.users),
    'accountsToday',  (select count(*) from auth.users where created_at >= t.today_start),
    'accounts7d',     (select count(*) from auth.users where created_at >= t.week_start),
    'checkouts',      (select count(distinct visitor_id) from public.analytics_events where type = 'checkout_start'),
    'checkoutsToday', (select count(distinct visitor_id) from public.analytics_events where type = 'checkout_start' and created_at >= t.today_start),
    'checkoutsLive',  (select count(distinct visitor_id) from public.analytics_events where type = 'checkout_start' and created_at >= t.live_start),
    'checkoutClicks', (select count(*) from public.analytics_events where type = 'checkout_start'),
    'checkoutClicksToday', (select count(*) from public.analytics_events where type = 'checkout_start' and created_at >= t.today_start),
    -- An order link is one event, counted in both checkout and WhatsApp totals.
    'whatsapp',       (select count(*) from public.analytics_events where type in ('whatsapp_click', 'checkout_start')),
    'whatsappToday',  (select count(*) from public.analytics_events where type in ('whatsapp_click', 'checkout_start') and created_at >= t.today_start),
    'whatsappLive',   (select count(*) from public.analytics_events where type in ('whatsapp_click', 'checkout_start') and created_at >= t.live_start),
    'whatsappVisitorsToday', (select count(distinct visitor_id) from public.analytics_events where type in ('whatsapp_click', 'checkout_start') and created_at >= t.today_start),
    'cartAdds',       (select count(*) from public.analytics_events where type = 'add_to_cart'),
    'cartAddsToday',  (select count(*) from public.analytics_events where type = 'add_to_cart' and created_at >= t.today_start),
    'cartVisitorsToday', (select count(distinct visitor_id) from public.analytics_events where type = 'add_to_cart' and created_at >= t.today_start),
    'orders',         (select count(*) from public.orders),
    'ordersToday',    (select count(*) from public.orders where created_at >= t.today_start),
    'orders7d',       (select count(*) from public.orders where created_at >= t.week_start),

    -- Zero-filled hourly buckets. The window bounds the scan to the chart range.
    'hourly', (
      select jsonb_agg(
        jsonb_build_object(
          'bucket', s.hour_start,
          'pageviews', coalesce(h.views, 0),
          'whatsapp', coalesce(h.clicks, 0)
        ) order by s.hour_start
      )
      from generate_series(t.current_hour - interval '23 hours', t.current_hour, interval '1 hour') s(hour_start)
      left join (
        select
          date_trunc('hour', created_at at time zone 'Africa/Lagos') at time zone 'Africa/Lagos' as hour_start,
          count(*) filter (where type = 'pageview') as views,
          count(*) filter (where type in ('whatsapp_click', 'checkout_start')) as clicks
        from public.analytics_events
        where created_at >= t.current_hour - interval '23 hours'
        group by 1
      ) h on h.hour_start = s.hour_start
    ),
    'topPages', (
      select coalesce(jsonb_agg(
        jsonb_build_object('path', path, 'views', views) order by views desc, path
      ), '[]'::jsonb)
      from (
        select path, count(*) as views
        from public.analytics_events
        where type = 'pageview' and created_at >= t.today_start
        group by path
        order by views desc, path
        limit 8
      ) p
    ),
    'recent', (
      select coalesce(jsonb_agg(
        jsonb_build_object('id', id, 'type', type, 'path', path, 'created_at', created_at)
        order by created_at desc, id
      ), '[]'::jsonb)
      from (
        select id, type, path, created_at
        from public.analytics_events
        where type <> 'heartbeat'
        order by created_at desc, id
        limit 12
      ) r
    )
  )
  from (
    select
      date_trunc('day', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos' as today_start,
      now() - interval '7 days' as week_start,
      now() - interval '5 minutes' as live_start,
      date_trunc('hour', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos' as current_hour
  ) t;
$$;

revoke all on function public.analytics_summary() from public, anon, authenticated;
grant execute on function public.analytics_summary() to service_role;

commit;

-- Optional housekeeping: heartbeat rows are only needed for the 5-minute live
-- window. If you want to cap table growth, schedule a periodic prune, e.g. with
-- pg_cron:  delete from public.analytics_events
--           where type = 'heartbeat' and created_at < now() - interval '2 days';
