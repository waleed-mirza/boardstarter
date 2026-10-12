-- Schema shape and database contract.
select plan(25);

select is(
  (select count(*)::int from information_schema.tables
   where table_schema = 'public' and table_type = 'BASE TABLE'
     and table_name in ('profiles', 'companies', 'categories', 'tags', 'packages',
     'jobs', 'job_tags', 'orders', 'payment_webhook_events', 'subscribers', 'applications', 'site_settings', 'admin_actions', 'email_queue')),
  14,
  'all application tables exist'
);

select ok(to_regclass('public.profiles') is not null, 'profiles table exists');
select ok(to_regclass('public.companies') is not null, 'companies table exists');
select ok(to_regclass('public.categories') is not null, 'categories table exists');
select ok(to_regclass('public.tags') is not null, 'tags table exists');
select ok(to_regclass('public.packages') is not null, 'packages table exists');
select ok(to_regclass('public.jobs') is not null, 'jobs table exists');
select ok(to_regclass('public.job_tags') is not null, 'job_tags table exists');
select ok(to_regclass('public.orders') is not null, 'orders table exists');
select ok(to_regclass('public.payment_webhook_events') is not null, 'payment webhook events table exists');
select ok(to_regclass('public.subscribers') is not null, 'subscribers table exists');
select ok(to_regclass('public.applications') is not null, 'applications table exists');
select ok(to_regclass('public.site_settings') is not null, 'site_settings table exists');
select ok(to_regclass('public.email_queue') is not null, 'email_queue table exists');

select is(
  (select count(*)::int from information_schema.columns
   where table_schema = 'public' and table_name in (
     'profiles', 'companies', 'categories', 'tags', 'packages', 'jobs', 'job_tags',
     'orders', 'payment_webhook_events', 'subscribers', 'applications', 'site_settings', 'admin_actions', 'email_queue')),
  124,
  'application tables expose the expected column count'
);

select ok(
  (select count(*) = 0 from (values
    ('profiles', 'id', 'uuid', 'NO'),
    ('profiles', 'role', 'USER-DEFINED', 'NO'),
    ('companies', 'owner_id', 'uuid', 'NO'),
    ('jobs', 'company_id', 'uuid', 'NO'),
    ('jobs', 'title', 'text', 'NO'),
    ('jobs', 'slug', 'text', 'NO'),
    ('jobs', 'description_md', 'text', 'NO'),
    ('jobs', 'search', 'tsvector', 'YES'),
    ('jobs', 'status', 'USER-DEFINED', 'NO'),
    ('jobs', 'views', 'integer', 'NO'),
    ('jobs', 'clicks', 'integer', 'NO'),
    ('jobs', 'rejection_reason', 'text', 'YES'),
    ('orders', 'provider_order_id', 'text', 'NO'),
    ('orders', 'package_id', 'uuid', 'YES'),
    ('orders', 'amount_mismatch', 'boolean', 'NO'),
    ('payment_webhook_events', 'provider_order_id', 'text', 'NO'),
    ('subscribers', 'token', 'text', 'NO'),
    ('applications', 'job_id', 'uuid', 'NO'),
    ('site_settings', 'key', 'text', 'NO'),
    ('site_settings', 'value', 'jsonb', 'NO'),
    ('admin_actions', 'actor_id', 'uuid', 'NO'),
    ('admin_actions', 'action', 'text', 'NO'),
    ('admin_actions', 'target_type', 'text', 'NO'),
    ('admin_actions', 'target_id', 'text', 'NO'),
    ('admin_actions', 'meta', 'jsonb', 'NO'),
    ('email_queue', 'to_email', 'text', 'NO'),
    ('email_queue', 'template', 'text', 'NO'),
    ('email_queue', 'payload', 'jsonb', 'NO'),
    ('email_queue', 'scheduled_for', 'timestamp with time zone', 'NO'),
    ('email_queue', 'sent_at', 'timestamp with time zone', 'YES'),
    ('email_queue', 'attempts', 'integer', 'NO'),
    ('email_queue', 'dedupe_key', 'text', 'NO'),
    ('email_queue', 'claimed_at', 'timestamp with time zone', 'YES'),
    ('email_queue', 'claim_token', 'uuid', 'YES')
  ) expected(table_name, column_name, data_type, is_nullable)
  left join information_schema.columns actual
    on actual.table_schema = 'public'
   and actual.table_name = expected.table_name
   and actual.column_name = expected.column_name
   and actual.data_type = expected.data_type
   and actual.is_nullable = expected.is_nullable
  where actual.column_name is null),
  'key columns have the expected types and nullability'
);

select ok(
  (select count(*) = 0 from (values
    ('profiles', 'role'), ('profiles', 'created_at'),
    ('jobs', 'status'), ('jobs', 'is_featured'), ('jobs', 'views'), ('jobs', 'clicks'),
    ('jobs', 'created_at'), ('jobs', 'updated_at'),
    ('subscribers', 'categories'), ('subscribers', 'frequency'),
    ('site_settings', 'value'), ('site_settings', 'updated_at')
  ) expected(table_name, column_name)
  left join information_schema.columns actual
    on actual.table_schema = 'public'
   and actual.table_name = expected.table_name
   and actual.column_name = expected.column_name
  where actual.column_default is null),
  'required columns have database defaults'
);

select is(
  (select count(*)::int from pg_constraint
   where connamespace = 'public'::regnamespace and contype = 'f'),
  13,
  'all expected application foreign keys exist'
);

select is(
  (select count(*)::int from pg_indexes
   where schemaname = 'public' and indexname in (
     'jobs_status_published_at_idx', 'jobs_category_id_idx', 'jobs_is_remote_idx',
     'jobs_expires_at_idx', 'jobs_search_idx', 'jobs_company_id_idx')),
  6,
  'job filtering and search indexes exist'
);

select ok(
  (select count(*) = 1 from information_schema.columns
   where table_schema = 'public' and table_name = 'jobs' and column_name = 'search'
     and data_type = 'tsvector' and is_generated = 'ALWAYS'),
  'jobs.search is a stored generated tsvector'
);

select ok(
  (select count(*) = 1 from pg_constraint
   where conrelid = 'public.jobs'::regclass and conname = 'jobs_salary_range_check'),
  'salary range constraint exists'
);

select ok(
  (select count(*) = 1 from pg_constraint
   where conrelid = 'public.jobs'::regclass and conname = 'jobs_published_dates_check'),
  'published date constraint exists'
);

select ok(
  (select array_agg(enumlabel order by enumsortorder)::text[] =
      array['employer', 'admin']::text[]
   from pg_enum where enumtypid = 'public.user_role'::regtype),
  'user_role enum is complete'
);

select ok(
  (select array_agg(enumlabel order by enumsortorder)::text[] =
      array['draft', 'pending_review', 'published', 'rejected', 'expired']::text[]
   from pg_enum where enumtypid = 'public.job_status'::regtype),
  'job_status enum is complete'
);

select ok(
  (select count(*) = 4 from pg_type
   where typnamespace = 'public'::regnamespace and typname in (
     'employment_type', 'apply_mode', 'order_status', 'alert_frequency')),
  'remaining Week 2 enums exist'
);

select * from finish();
