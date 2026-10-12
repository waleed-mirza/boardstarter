-- Onboarding RPC (Week 3 task 6): create_company_for_profile must be the
-- only path that links a profile to a company, atomically, for callers that
-- do not have one yet. Runs inside the rolling-back transaction harness.
select plan(8);

-- Two fresh users; their profile rows come from the handle_new_user trigger.
-- Column set mirrors supabase/seed.sql (instance_id is uuid-typed).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_token, recovery_token,
  email_change_token_new, email_change, phone_change, phone_change_token,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_super_admin, is_anonymous
) values
  ('00000000-0000-0000-0000-000000000000', extensions.gen_random_uuid(),
   'authenticated', 'authenticated', 'onboarding-a@example.test',
   extensions.crypt('DemoPass!234', extensions.gen_salt('bf')),
   now(), '', '', '', '', '', '',
   '{"provider":"email","seed_source":"pgtap"}'::jsonb,
   '{"full_name":"Onboarding A","email_verified":true}'::jsonb,
   now(), now(), false, false),
  ('00000000-0000-0000-0000-000000000000', extensions.gen_random_uuid(),
   'authenticated', 'authenticated', 'onboarding-b@example.test',
   extensions.crypt('DemoPass!234', extensions.gen_salt('bf')),
   now(), '', '', '', '', '', '',
   '{"provider":"email","seed_source":"pgtap"}'::jsonb,
   '{"full_name":"Onboarding B","email_verified":true}'::jsonb,
   now(), now(), false, false);

-- Sanity: the trigger gave both users a profile with no company.
select is(
  (select count(*)::int from public.profiles p
   join auth.users u on u.id = p.id
   where u.email in ('onboarding-a@example.test', 'onboarding-b@example.test')
     and p.company_id is null),
  2,
  'fresh users get profile rows with no company'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id::text from auth.users where email = 'onboarding-a@example.test'),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

select ok(
  public.create_company_for_profile(
    'Acme Rockets!', 'https://acme.example.test', 'Remote', 'Suborbital logistics.'
  ) is not null,
  'returns the new company id'
);

select is(
  (select c.slug from public.companies c
   join public.profiles p on p.company_id = c.id
   where p.id = auth.uid()),
  'acme-rockets',
  'creates a slugified company linked to the caller profile'
);

select is(
  (select c.website from public.companies c where c.slug = 'acme-rockets'),
  'https://acme.example.test',
  'stores the optional fields'
);

select throws_ok(
  $$select public.create_company_for_profile('Second Company', null, null, null)$$,
  'P0001',
  'a company is already linked to this profile',
  'second call for the same profile is rejected'
);

-- Slug collision: seeded 'northstar-labs' must force a suffixed slug.
-- RESET ROLE first: auth.users is not readable as `authenticated`, so the
-- claims subquery must run as the test role before switching back.
reset role;
select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id::text from auth.users where email = 'onboarding-b@example.test'),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

select ok(
  public.create_company_for_profile('Northstar Labs', null, null, null) is not null,
  'collision call still succeeds with a suffixed slug'
);

select is(
  (select count(*)::int from public.companies
   where slug in ('northstar-labs-2', 'northstar-labs-3')),
  1,
  'slug collisions get a unique numeric suffix'
);

-- Anonymous callers cannot execute the RPC at all.
set local role anon;
select throws_ok(
  $$select public.create_company_for_profile('Nope', null, null, null)$$,
  '42501',
  null,
  'anonymous execution is denied'
);

select * from finish();
