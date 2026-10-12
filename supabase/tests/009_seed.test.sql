select plan(12);

select is((select count(*)::int from public.categories), 8, 'seed contains 8 categories');
select is((select count(*)::int from public.tags), 20, 'seed contains 20 tags');
select is((select count(*)::int from public.packages), 3, 'seed contains 3 packages');
select is((select count(*)::int from public.companies), 12, 'seed contains 12 companies');
select is((select count(*)::int from public.jobs), 50, 'seed contains 50 jobs');
select is((select count(*)::int from public.profiles), 3, 'seed contains 3 test profiles');
select is(
  (select count(*)::int from auth.users where raw_app_meta_data ->> 'seed_source' = 'fixture-test'),
  3,
  'seed marks exactly 3 test identities for safe reset'
);
select is(
  (select count(*)::int from public.jobs where status = 'published'),
  27,
  'seed contains 27 published jobs'
);
select ok(
  (select count(*) > 0 from public.jobs where is_remote)
  and (select count(*) > 0 from public.jobs where not is_remote),
  'seed includes remote and on-site jobs'
);
select ok(
  (select count(*) > 0 from public.jobs where salary_min is not null and salary_max is not null)
  and (select count(*) > 0 from public.jobs where salary_min is null),
  'seed includes salary and no-salary variants'
);
select is(
  (select count(*)::int from public.site_settings
   where value::text ilike '%boardstarter%'),
  0,
  'seed settings do not leak the product name'
);

select is(
  (select count(*)::int from public.profiles p
   join auth.users u on u.id = p.id
   join public.companies c on c.id = p.company_id
   where u.email in ('employer-a@example.test', 'employer-b@example.test')),
  2,
  'seeded employers are linked to their primary company'
);

select * from finish();
