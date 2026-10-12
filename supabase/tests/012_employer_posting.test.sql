select plan(8);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id::text from auth.users where email = 'employer-a@example.test'),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

select lives_ok(
  $$insert into public.jobs (
    company_id, title, slug, description_md, category_id, employment_type,
    location, is_remote, salary_min, salary_max, currency, salary_period,
    apply_mode, apply_url, status, package_id, is_featured,
    published_at, expires_at, views, clicks
  ) values (
    (select company_id from public.profiles where id = auth.uid()),
    'Week Five Test Job', 'week-five-test-job', repeat('A useful description. ', 6),
    (select id from public.categories where slug = 'software-engineering'),
    'full_time', 'Remote', true, 100, 200, 'USD', 'year', 'url',
    'https://example.test/apply', 'published',
    (select id from public.packages limit 1), true, now(), now() + interval '30 days', 99, 99
  )$$,
  'a crafted employer insert is accepted as a safe draft rather than published'
);

select is(
  (select status::text from public.jobs where slug = 'week-five-test-job'),
  'draft',
  'employer-created jobs are forced to draft'
);

select is(
  (select count(*)::int from public.jobs where slug = 'week-five-test-job' and published_at is null and expires_at is null and is_featured = false and views = 0 and clicks = 0),
  1,
  'employer insert clears every protected workflow field'
);

select is(
  (select count(*)::int from public.jobs j join public.companies c on c.id = j.company_id where c.slug = 'cobalt-research'),
  0,
  'Employer A cannot read Employer B jobs'
);

select lives_ok(
  $$select public.close_employer_job((select id from public.jobs where slug = 'week-five-test-job'))$$,
  'an owner can close their own job through the narrow RPC'
);

select is(
  (select status::text from public.jobs where slug = 'week-five-test-job'),
  'expired',
  'close RPC moves the owned job to expired'
);

select is(
  (select count(*)::int from public.jobs where slug = 'week-five-test-job' and expires_at <= now()),
  1,
  'closed jobs are no longer active'
);

select throws_ok(
  $$update public.jobs set status = 'published' where slug = 'qa-automation-engineer'$$,
  'P0001',
  'status is managed by the payment or admin workflow',
  'direct employer status updates remain blocked'
);

select * from finish();
