-- ═══════════════════════════════════════════════════════════
--  SwagOnCampus — Category migration (one time, safe to re-run)
--  Run this in: Supabase → SQL Editor → New query
--
--  Re-maps old category values on existing products to the new
--  6-category structure. Products already using the new values
--  are left untouched.
-- ═══════════════════════════════════════════════════════════

update products set category = 'jackets-hoodies'
  where category in ('hoodies', 'outerwear');

update products set category = 'trousers-jeans'
  where category in ('bottoms', 'joggers');

update products set category = 'watches-accessories'
  where category in ('accessories');

update products set category = 'corporate-dresses'
  where category in ('dresses');

update products set category = 'tops'
  where category in ('longsleeves');
