select plan(8);

set local role anon;

select is(
  ((select public.search_public_jobs('{}'::jsonb, 1, 20))->>'total')::integer,
  27,
  'public job projection contains only live jobs'
);

select is(
  ((select public.search_public_jobs('{"query":"qa automation engineer"}'::jsonb, 1, 20))->>'total')::integer,
  0,
  'public search excludes pending workflow rows'
);

select ok(
  (select public.get_public_job_by_slug('senior-ruby-engineer-expired') is not null),
  'expired published slug has a safe public detail projection'
);

select is(
  (select (public.get_public_job_by_slug('senior-ruby-engineer-expired')->>'is_expired')::boolean),
  true,
  'expired public detail is marked expired'
);

select is(
  (select (public.get_public_company_by_slug('northstar-labs') ->> 'name')),
  'Northstar Labs',
  'public company projection exposes its name'
);

select ok(
  not ((public.get_public_company_by_slug('northstar-labs')) ? 'owner_id'),
  'public company projection does not expose owner_id'
);

select is(
  (select ((public.get_public_job_facets('{}'::jsonb)->'categories')::jsonb @> '[{"value":"software-engineering","count":12}]'::jsonb)),
  true,
  'public category facets contain seeded live counts'
);

select is(
  (select (public.get_public_board_stats()->>'companyCount')::integer),
  11,
  'board stats count only companies with live jobs'
);

select * from finish();
