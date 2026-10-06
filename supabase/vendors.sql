-- ═══════════════════════════════════════════════════════════
--  SwagOnCampus — Vendors
--  Run after schema.sql (and analytics.sql) in Supabase → SQL Editor.
--  Safe to re-run.
--
--  Model:
--   • vendor_id IS NULL          → store-owned product (the owner)
--   • vendor_id = <user uuid>    → a vendor's product
--   • vendor_price               → the price the vendor set
--   • markup                     → the owner's flat profit added on top
--   • price                      → customer-facing price = vendor_price + markup
-- ═══════════════════════════════════════════════════════════
begin;

-- ── Products: ownership + pricing columns ──────────────────
alter table public.products
  add column if not exists vendor_id    uuid references auth.users(id) on delete set null,
  add column if not exists vendor_price numeric(10,2),
  add column if not exists markup       numeric(10,2) not null default 0;

-- A vendor product must always carry the vendor's price.
alter table public.products drop constraint if exists products_vendor_price_check;
alter table public.products add constraint products_vendor_price_check
  check (vendor_id is null or vendor_price is not null);

create index if not exists products_vendor_idx on public.products (vendor_id, created_at desc);

-- ── Profiles: allow the vendor role ────────────────────────
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('customer', 'admin', 'vendor'));

-- ── Authorization helpers (single source of truth) ─────────
-- The owner is the store email; a vendor is a profile with role='vendor'.
-- Kept SECURITY DEFINER so RLS policies and the app can call them safely.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    lower((select auth.jwt()) ->> 'email') = lower(public.analytics_admin_email()),
    false
  )
$$;

create or replace function public.is_vendor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'vendor'
  )
$$;

revoke all on function public.is_owner()  from public, anon;
revoke all on function public.is_vendor() from public, anon;
grant execute on function public.is_owner()  to authenticated, service_role;
grant execute on function public.is_vendor() to authenticated, service_role;

-- ── Products RLS ───────────────────────────────────────────
-- Public read stays open; writes are owner-or-owning-vendor only.
-- The app writes with the service role (which bypasses RLS), so these
-- policies are defence in depth for any direct client access.
alter table public.products enable row level security;

drop policy if exists "products_public_read"  on public.products;
drop policy if exists "products_admin_insert" on public.products;
drop policy if exists "products_admin_update" on public.products;
drop policy if exists "products_admin_delete" on public.products;
drop policy if exists "products_owner_insert"  on public.products;
drop policy if exists "products_owner_update"  on public.products;
drop policy if exists "products_owner_delete"  on public.products;
drop policy if exists "products_vendor_insert" on public.products;
drop policy if exists "products_vendor_update" on public.products;
drop policy if exists "products_vendor_delete" on public.products;

create policy "products_public_read" on public.products
  for select using (true);

create policy "products_owner_insert" on public.products
  for insert to authenticated with check (public.is_owner());
create policy "products_owner_update" on public.products
  for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "products_owner_delete" on public.products
  for delete to authenticated using (public.is_owner());

create policy "products_vendor_insert" on public.products
  for insert to authenticated
  with check (public.is_vendor() and vendor_id = (select auth.uid()));
create policy "products_vendor_update" on public.products
  for update to authenticated
  using      (public.is_vendor() and vendor_id = (select auth.uid()))
  with check (public.is_vendor() and vendor_id = (select auth.uid()));
create policy "products_vendor_delete" on public.products
  for delete to authenticated
  using (public.is_vendor() and vendor_id = (select auth.uid()));

-- ── Storage: vendors upload only into their own folder ─────
-- Files are stored as "<user uuid>/<file>"; the owner may write anywhere.
drop policy if exists "product-images_admin_insert" on storage.objects;
drop policy if exists "product-images_upload"       on storage.objects;

create policy "product-images_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and (
      public.is_owner()
      or (public.is_vendor() and (storage.foldername(name))[1] = (select auth.uid())::text)
    )
  );

commit;
