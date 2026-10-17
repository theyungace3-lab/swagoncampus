-- ═══════════════════════════════════════════════════════════
--  SwagOnCampus — Product condition labels (NEW / Thrift)
--  Run in Supabase → SQL Editor → New query (after schema.sql).
--  Safe to re-run.
--
--  Adds products.product_condition: 'new' (default) or 'thrift'.
--  The storefront shows a NEW / THRIFT badge on every product so
--  customers never mistake a thrifted piece for a brand-new one.
--  Existing products default to 'new' and can be re-labelled from
--  the admin (or vendor) panel → Edit Product → Condition.
-- ═══════════════════════════════════════════════════════════
begin;

alter table public.products
  add column if not exists product_condition text not null default 'new';

alter table public.products drop constraint if exists products_condition_check;
alter table public.products
  add constraint products_condition_check
  check (product_condition in ('new', 'thrift'));

commit;
