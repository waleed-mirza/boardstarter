select plan(6);

select set_config(
  'test.counter_views_before',
  (select views::text from public.jobs where slug = 'senior-typescript-engineer'),
  true
);

select is(
  (select public.increment_job_counter(
    (select id from public.jobs where slug = 'senior-typescript-engineer'), 'views')),
  current_setting('test.counter_views_before')::integer + 1,
  'counter RPC increments views and returns the new value'
);

select set_config(
  'test.counter_clicks_before',
  (select clicks::text from public.jobs where slug = 'senior-typescript-engineer'),
  true
);

select is(
  (select public.increment_job_counter(
    (select id from public.jobs where slug = 'senior-typescript-engineer'), 'clicks')),
  current_setting('test.counter_clicks_before')::integer + 1,
  'counter RPC increments clicks and returns the new value'
);

select throws_ok(
  $$select public.increment_job_counter(
    (select id from public.jobs where slug = 'senior-typescript-engineer'), 'status')$$,
  'P0001',
  'counter kind must be views or clicks',
  'counter RPC rejects any other column'
);

select ok(
  (select search @@ websearch_to_tsquery('english', 'typescript developer')
   from public.jobs where slug = 'senior-typescript-engineer'),
  'generated search vector finds seeded terms'
);

select ok(
  (select search @@ websearch_to_tsquery('english', 'care navigation')
   from public.jobs where slug = 'product-manager-care-navigation'),
  'search vector includes description text'
);

select ok(
  (select search = to_tsvector('english', coalesce(title, '') || ' ' ||
    coalesce(description_md, '') || ' ' || coalesce(location, '') || ' ' ||
    coalesce(remote_region, '')) from public.jobs where slug = 'senior-typescript-engineer'),
  'search vector is derived from the current row'
);

select * from finish();
