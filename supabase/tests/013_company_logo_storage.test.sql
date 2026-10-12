select plan(4);

select is(
  (select file_size_limit from storage.buckets where id = 'company-logos'),
  2097152::bigint,
  'company logo bucket is limited to 2 MB'
);

select is(
  (select public from storage.buckets where id = 'company-logos'),
  true,
  'company logo bucket is public-read'
);

select ok(
  (select allowed_mime_types @> array['image/png', 'image/jpeg', 'image/webp']::text[] from storage.buckets where id = 'company-logos'),
  'company logo bucket allows only the supported image MIME types'
);

select ok(
  (select count(*) >= 4 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'company_logos_%'),
  'company logo storage has public read and owner write policies'
);

select * from finish();
