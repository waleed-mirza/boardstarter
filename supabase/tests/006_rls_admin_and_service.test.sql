select plan(5);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id::text from auth.users where email = 'admin@example.test'),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

select ok((select private.is_admin()), 'admin profile is recognized by the policy helper');
select is((select count(*)::int from public.jobs), 50, 'admin can read every job');
select is((select count(*)::int from public.companies), 12, 'admin can read every company');
select is((select count(*)::int from public.profiles), 3, 'admin can read every profile');

set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select ok(
  (select has_table_privilege('service_role', 'public.jobs', 'update')),
  'the secret-key role can perform protected job writes'
);

select * from finish();
