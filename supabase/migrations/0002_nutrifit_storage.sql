-- NutriFit image storage.
--
-- Meal photos and profile avatars live in two Supabase Storage buckets so they
-- follow the account to every device instead of staying in one browser's
-- localStorage. The buckets are public because the app renders a photo with a
-- plain <img src="..."> (this also lets the browser and the native WebView
-- cache it). Object paths always start with the owner's user id and end with a
-- random suffix, so a URL cannot be guessed or enumerated. Writes are still
-- restricted to the signed-in owner by the policies below.
--
-- Run this after 0001_nutrifit_core.sql. It is idempotent.

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('meal-images', 'meal-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Columns the app reads and writes
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists avatar_url text not null default '';
alter table public.meals add column if not exists image_url text not null default '';

-- ---------------------------------------------------------------------------
-- Object policies
--
-- Files are stored as "<auth.uid()>/<name>", so the first path segment must
-- match the signed-in account for every write. Public object reads are served
-- through the public URL endpoint and do not need a select policy, but owners
-- keep one so the app can list and clean up its own folder.
-- ---------------------------------------------------------------------------

drop policy if exists "NutriFit images select own" on storage.objects;
drop policy if exists "NutriFit images insert own" on storage.objects;
drop policy if exists "NutriFit images update own" on storage.objects;
drop policy if exists "NutriFit images delete own" on storage.objects;

create policy "NutriFit images select own"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('avatars', 'meal-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "NutriFit images insert own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'meal-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "NutriFit images update own"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('avatars', 'meal-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('avatars', 'meal-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "NutriFit images delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('avatars', 'meal-images')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
