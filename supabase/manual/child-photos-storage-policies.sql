-- -----------------------------------------------------------------------------
-- Child profile photos — Storage policies for Supabase (fix RLS upload blocks)
-- -----------------------------------------------------------------------------
-- Run in: Supabase Dashboard → SQL Editor (hosted project only).
--
-- 1) Storage → New bucket → name: child-photos → Public: ON
-- 2) Paste and RUN this whole script.
--
-- App uploads to:  {auth_user_id}/child-....jpg
-- Policies below require that path so uploads match auth.uid() (Supabase best practice).
-- -----------------------------------------------------------------------------

-- Clean up previous versions (safe to re-run)
drop policy if exists "Public read child photos" on storage.objects;
drop policy if exists "Authenticated insert child photos" on storage.objects;
drop policy if exists "Authenticated update own child photos" on storage.objects;
drop policy if exists "Authenticated delete own child photos" on storage.objects;

-- Anyone can read objects in this bucket (needed for getPublicUrl / avatars)
create policy "Public read child photos"
on storage.objects
for select
using (bucket_id = 'child-photos');

-- Signed-in users can upload only under their own folder: {uid}/...
create policy "Authenticated insert child photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'child-photos'
  and name like (auth.uid()::text || '/%')
);

-- Upsert / replace needs UPDATE (upload uses upsert: true in the app)
create policy "Authenticated update own child photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'child-photos'
  and name like (auth.uid()::text || '/%')
)
with check (
  bucket_id = 'child-photos'
  and name like (auth.uid()::text || '/%')
);

-- Remove files only from own folder
create policy "Authenticated delete own child photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'child-photos'
  and name like (auth.uid()::text || '/%')
);
