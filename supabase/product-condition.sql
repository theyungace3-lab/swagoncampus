-- ═══════════════════════════════════════════════════════════
--  SwagOnCampus — Product condition labels (NEW / Thrift)
--  Run in Supabase → SQL Editor → New query (after schema.sql).
--  Safe to re-run.
--
--  products.product_condition is NULL (= unlabeled, no badge on the
--  storefront) until the owner or a vendor picks a label per product
--  from the panel: 'new' or 'thrift'.
--
--  If you ran the earlier version of this file (which made the column
--  NOT NULL with default 'new'), this file undoes that and clears all
--  labels back to "unlabeled", so every product starts without a badge.
-- ═══════════════════════════════════════════════════════════
begin;

alter table public.products
  add column if not exists product_condition text;

alter table public.products alter column product_condition drop not null;
alter table public.products alter column product_condition drop default;

update public.products
   set product_condition = null
 where product_condition is not null;

alter table public.products drop constraint if exists products_condition_check;
alter table public.products
  add constraint products_condition_check
  check (product_condition is null or product_condition in ('new', 'thrift'));

commit;
