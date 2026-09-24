-- ═══════════════════════════════════════════════════════════
--  SwagOnCampus — Product image upload bucket
--  Run this in: Supabase → SQL Editor → New query
--  (One time only. Makes the "product-images" bucket public.)
-- ═══════════════════════════════════════════════════════════

-- Create a public bucket for product images (idempotent)
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

-- Allow authenticated admins to upload. (Uploads happen server-side
-- with the service role key, so this is only a safety net.)
create policy "product-images_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'product-images'
    and auth.jwt() ->> 'email' = current_setting('app.admin_email', true)
  );

-- Allow anyone to read public product images
create policy "product-images_public_read"
  on storage.objects for select
  using (bucket_id = 'product-images');
