select plan(10);

select ok(
  (select count(*)::int from public.profiles) = (select count(*)::int from auth.users),
  'every auth user has exactly one profile'
);

select lives_ok(
  $$insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change, phone_change_token, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_super_admin, is_anonymous
  ) values (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated',
    'trigger-check@example.test', extensions.crypt('DemoPass!234', extensions.gen_salt('bf')),
    now(), '', '', '', '', '', '',
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Trigger Check"}'::jsonb, now(), now(), null, false
  )$$,
  'inserting an auth user succeeds'
);
select is(
  (select count(*)::int from public.profiles where id = '11111111-1111-1111-1111-111111111111'),
  1,
  'auth insert creates exactly one profile'
);

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id::text from auth.users where email = 'employer-a@example.test'),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

select throws_ok(
  $$update public.jobs set status = 'published' where slug = 'qa-automation-engineer'$$,
  'P0001',
  'status is managed by the payment or admin workflow',
  'employers cannot publish through a direct update'
);
select throws_ok(
  $$update public.jobs set is_featured = true where slug = 'qa-automation-engineer'$$,
  'P0001',
  'is_featured is managed by the payment or admin workflow',
  'employers cannot feature through a direct update'
);
select throws_ok(
  $$update public.jobs set published_at = now() where slug = 'qa-automation-engineer'$$,
  'P0001',
  'published_at is managed by the payment or admin workflow',
  'employers cannot set published_at through a direct update'
);
select throws_ok(
  $$update public.jobs set expires_at = now() + interval '30 days' where slug = 'qa-automation-engineer'$$,
  'P0001',
  'expires_at is managed by the payment or admin workflow',
  'employers cannot set expires_at through a direct update'
);
select throws_ok(
  $$update public.jobs set views = views + 1 where slug = 'qa-automation-engineer'$$,
  'P0001',
  'views and clicks are managed by increment_job_counter',
  'employers cannot change views outside the counter RPC'
);
select throws_ok(
  $$update public.jobs set clicks = clicks + 1 where slug = 'qa-automation-engineer'$$,
  'P0001',
  'views and clicks are managed by increment_job_counter',
  'employers cannot change clicks outside the counter RPC'
);

select lives_ok(
  $$update public.jobs set title = title || ' (edited)' where slug = 'qa-automation-engineer'$$,
  'employers can update ordinary owned job fields'
);

select * from finish();
