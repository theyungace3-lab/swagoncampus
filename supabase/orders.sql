-- ═══════════════════════════════════════════════════════════
--  SwagOnCampus — WhatsApp checkout order IDs + paid workflow
--  Run after schema.sql in Supabase → SQL Editor → New query.
--  Safe to re-run.
--
--  Flow:
--   • Checkout creates an order row with a copyable Order ID (SOC-XXXXXX)
--   • The ID is embedded in the WhatsApp message the customer sends
--   • The admin pastes the ID in the dashboard and marks it paid
--   • Marking paid sets status='paid' and flips each ordered product to
--     in_stock=false + sold=true (vendor panel shows "Sold · contact admin")
-- ═══════════════════════════════════════════════════════════
begin;

-- ── Orders: human-copyable code + payment timestamp ────────
alter table public.orders
  add column if not exists order_code text,
  add column if not exists paid_at     timestamptz;

-- Widen the status check to include 'paid'.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (status in ('pending', 'confirmed', 'delivered', 'cancelled', 'paid'));

create unique index if not exists orders_order_code_key on public.orders (order_code);

-- Give every existing order a code so old WhatsApp threads stay matchable.
do $$
declare
  rid     uuid;
  code    text;
  attempts int;
begin
  for rid in select id from public.orders where order_code is null or order_code = '' loop
    attempts := 0;
    loop
      code := 'SOC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
      exit when not exists (select 1 from public.orders o where o.order_code = code);
      attempts := attempts + 1;
      exit when attempts > 100;
    end loop;
    update public.orders set order_code = code where id = rid;
  end loop;
end $$;

alter table public.orders alter column order_code set not null;

-- ── Products: sold flag set when an order is marked paid ───
alter table public.products
  add column if not exists sold boolean not null default false;

commit;
