-- ══════════════════════════════════════════════════════════
--  SwagOnCampus — Fix/Re-run (safe to run multiple times)
--  Run this in: Supabase → SQL Editor → New query
-- ══════════════════════════════════════════════════════════

-- 1. Re-create the profile trigger (in case it was missed)
-- SECURITY DEFINER with a pinned search_path; never copies a role from metadata.
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. Recreate the public/read policies safely.
-- WARNING: this script used to create `using (true)` write policies, which let
-- any signed-in customer edit products, discounts, orders, and (worst) their own
-- profile role. Those permissive policies are removed here. All admin writes go
-- through the service-role API, which bypasses RLS, so no write policy is needed.
-- Run supabase/vendors.sql for the owner/vendor product policies, and
-- supabase/harden-profiles.sql to lock profile role changes down.

-- Products: public read only (admin writes use the service role)
drop policy if exists "products_public_read"  on products;
drop policy if exists "products_admin_insert" on products;
drop policy if exists "products_admin_update" on products;
drop policy if exists "products_admin_delete" on products;
drop policy if exists "products_owner_insert" on products;
drop policy if exists "products_owner_update" on products;
drop policy if exists "products_owner_delete" on products;
drop policy if exists "products_vendor_insert" on products;
drop policy if exists "products_vendor_update" on products;
drop policy if exists "products_vendor_delete" on products;
create policy "products_public_read" on products for select using (true);

-- Discounts: public read only
drop policy if exists "discounts_public_read" on discounts;
drop policy if exists "discounts_admin_write" on discounts;
create policy "discounts_public_read" on discounts for select using (true);

-- Profiles: own row only. No `using (true)` policy, no role escalation.
-- Roles are managed by the service-role owner API.
drop policy if exists "profiles_own_read"   on profiles;
drop policy if exists "profiles_own_update" on profiles;
drop policy if exists "profiles_admin_all"  on profiles;
create policy "profiles_own_read"   on profiles for select using (auth.uid() = id);
create policy "profiles_own_update" on profiles for update
  using      (auth.uid() = id)
  with check (auth.uid() = id);

-- Orders: read your own; creation goes through the service role.
drop policy if exists "orders_own_read"   on orders;
drop policy if exists "orders_own_insert" on orders;
drop policy if exists "orders_admin_all"  on orders;
create policy "orders_own_read" on orders for select using (auth.uid() = user_id);

-- 3. Seed products (skips existing ones)
insert into products (name, description, price, category, image, sizes, colors, in_stock, featured) values
('Classic White Tee',     'Premium cotton crew neck tee, perfect for campus life.',    4000,  'tops',               'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&q=80', array['XS','S','M','L','XL'],             array['White','Black','Grey'],      true, true),
('Baggy Cargo Jeans',     'Relaxed fit cargo jeans with multiple pockets.',            9000,  'trousers-jeans',     'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&q=80', array['28','30','32','34','36'],           array['Blue','Black','Khaki'],      true, true),
('Campus Hoodie',         'Cozy fleece hoodie for cool FUNAAB evenings.',              6500,  'jackets-hoodies',    'https://images.unsplash.com/photo-1509942774463-acf339cf87d5?w=400&q=80', array['S','M','L','XL','XXL'],            array['Black','Navy','Brown'],      true, true),
('Floral Midi Dress',     'Elegant floral midi dress for lectures and events.',        7200,  'corporate-dresses',  'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&q=80', array['XS','S','M','L'],                  array['Floral Red','Floral Blue'],  true, true),
('Varsity Jacket',        'Classic varsity jacket to flex on campus.',                 12000, 'jackets-hoodies',    'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80', array['S','M','L','XL'],                  array['Black/Gold','Navy/White'],   true, false),
('White Chunky Sneakers', 'Chunky sole sneakers for that drip look.',                  9500,  'footwear',           'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80', array['38','39','40','41','42','43','44'], array['White','Triple Black'],      true, false),
('Jogger Sweatpants',     'Comfortable tapered joggers for everyday wear.',            4800,  'trousers-jeans',     'https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=400&q=80', array['S','M','L','XL'],                  array['Grey','Black','Olive'],      true, false),
('Gold Chain Necklace',   'Stainless steel gold plated chain necklace.',               2500,  'watches-accessories','https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&q=80', array['One Size'],                        array['Gold','Silver'],             true, false),
('Oversized Graphic Tee', 'Oversized fit with exclusive campus graphic prints.',       4200,  'tops',               'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&q=80', array['S','M','L','XL','XXL'],           array['White','Black','Beige'],     true, false),
('Biker Shorts',          'Stretchy high waist biker shorts.',                         3200,  'trousers-jeans',     'https://images.unsplash.com/photo-1594938298603-c8148c4b4d35?w=400&q=80', array['XS','S','M','L'],                  array['Black','Brown','Sage'],      true, false),
('Thermal Long Sleeve',   'Slim fit long sleeve thermal top, great for layering.',     4500,  'tops',               'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80', array['XS','S','M','L','XL'],           array['White','Black','Cream'],     true, false)
on conflict do nothing;
