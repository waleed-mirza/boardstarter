select plan(9);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id::text from auth.users where email = 'employer-a@example.test'),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

select is(
  (select count(*)::int from public.companies c
   where c.owner_id = auth.uid()),
  11,
  'Employer A can read their companies'
);

select is(
  (select count(*)::int from public.companies c
   where c.slug = 'cobalt-research'),
  0,
  'Employer A cannot read Employer B company rows'
);

select is(
  (select count(*)::int from public.jobs j
   join public.companies c on c.id = j.company_id
   where c.owner_id = auth.uid()),
  47,
  'Employer A can read all of their jobs'
);

select is(
  (select count(*)::int from public.jobs j
   join public.companies c on c.id = j.company_id
   where c.slug = 'cobalt-research'),
  0,
  'Employer A cannot read Employer B jobs'
);

select is(
  (select count(*)::int from public.jobs j
   where j.slug = 'qa-automation-engineer'),
  1,
  'Employer A can read and update an owned job'
);

select is(
  (select count(*)::int from public.orders o
   join public.jobs j on j.id = o.job_id
   join public.companies c on c.id = j.company_id
   where c.owner_id = auth.uid()),
  0,
  'Employer order reads are scoped to owned companies'
);

select is(
  (select count(*)::int from public.jobs
   where company_id = (select id from public.companies where slug = 'cobalt-research')),
  0,
  'Employer A cannot see Employer B private workflow rows'
);

select ok(
  (select private.is_admin()) is false,
  'Employer A is not treated as an admin'
);

select throws_ok(
  $$update public.companies set unlimited_until = now() where slug = 'northstar-labs'$$,
  '42501',
  null,
  'employer cannot write the subscription column unlimited_until'
);

select * from finish();
