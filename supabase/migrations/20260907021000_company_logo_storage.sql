-- Week 5 company logo storage. Objects are public-readable for board logos,
-- but writes are restricted to the authenticated user's own directory.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'company-logos',
  'company-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists company_logos_public_read on storage.objects;
create policy company_logos_public_read on storage.objects
  for select to public
  using (bucket_id = 'company-logos');

drop policy if exists company_logos_owner_insert on storage.objects;
create policy company_logos_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists company_logos_owner_update on storage.objects;
create policy company_logos_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists company_logos_owner_delete on storage.objects;
create policy company_logos_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'company-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
