select plan(6);

set local role anon;

select is(
  (select count(*)::int from public.jobs),
  27,
  'anonymous users see only live published jobs'
);

select is(
  (select count(*)::int from public.jobs where status <> 'published'::public.job_status),
  0,
  'anonymous users cannot see workflow jobs'
);

select is(
  (select count(*)::int from public.jobs where expires_at <= now()),
  0,
  'anonymous users cannot see expired jobs'
);

select is((select count(*)::int from public.orders), 0, 'anonymous users cannot read orders');
select is((select count(*)::int from public.subscribers), 0, 'anonymous users cannot read subscribers');
select is(
  (select count(*)::int from public.profiles) +
  (select count(*)::int from public.applications),
  0,
  'anonymous users cannot read profiles or applications'
);

select * from finish();
