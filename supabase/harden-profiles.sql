-- ═══════════════════════════════════════════════════════════
--  SwagOnCampus — Lock down profiles (stop role self-escalation)
--  Run after schema.sql, analytics.sql, and vendors.sql.
--  Safe to re-run.
--
--  Problem: a signed-in customer could run
--    update profiles set role = 'vendor' where id = auth.uid();
--  because the "profiles_own_update" policy had no `with check`, and the
--  "profiles_admin_all" policy (or the one in fix.sql) used `using (true)`.
--  That let any account grant itself vendor (or admin) access.
--
--  Fix: least-privilege column grants, owner-scoped policies, and a trigger
--  that refuses role/id changes from the API unless the caller is privileged.
--  The owner still promotes vendors through the service-role API.
--
--  Requires public.is_owner() from vendors.sql.
-- ═══════════════════════════════════════════════════════════
begin;

-- ── 1. Least-privilege grants ──────────────────────────────
-- The browser never writes profiles; role changes use the service role.
-- Revoke broad write access, then allow only safe self-service columns.
revoke insert, update, delete, truncate, references, trigger
  on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, hostel) on public.profiles to authenticated;

-- ── 2. Replace loose policies with explicit, owner-scoped ones ──
alter table public.profiles enable row level security;

drop policy if exists "profiles_own_read"    on public.profiles;
drop policy if exists "profiles_own_update"  on public.profiles;
drop policy if exists "profiles_admin_all"   on public.profiles;
drop policy if exists "profiles_owner_all"   on public.profiles;
drop policy if exists "profiles_admin_insert" on public.profiles;

create policy "profiles_own_read" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

-- Only the caller's own row, and the with-check keeps the row identity fixed.
create policy "profiles_own_update" on public.profiles
  for update to authenticated
  using      ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_owner_all" on public.profiles
  for all to authenticated
  using      (public.is_owner())
  with check (public.is_owner());

-- ── 3. Defense in depth ────────────────────────────────────
-- Even if grants or policies are later loosened, the API cannot change a
-- role or a profile id. Direct DB/SQL-editor sessions (no request JWT) and
-- the service role remain able to fix data on purpose.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  api_request boolean;
  privileged  boolean;
begin
  api_request := nullif(current_setting('request.jwt.claims', true), '') is not null;
  privileged  := (not api_request)
              or coalesce((select auth.role()) = 'service_role', false)
              or public.is_owner();

  if tg_op = 'INSERT' then
    if not privileged and coalesce(new.role, 'customer') <> 'customer' then
      raise exception 'New accounts cannot be created with a privileged role'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'A profile id cannot be changed' using errcode = '42501';
  end if;
  if new.role is distinct from old.role and not privileged then
    raise exception 'Only the store owner can change a profile role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.profiles_guard() from public, anon, authenticated;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- ── 4. Pin the signup trigger ──────────────────────────────
-- SECURITY DEFINER with a fixed search_path, and it never copies a role from
-- user metadata, so a signup payload cannot request a privileged role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

commit;
