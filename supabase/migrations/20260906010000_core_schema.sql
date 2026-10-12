-- Week 2 core schema. All application objects live in public; the migration
-- runner's bookkeeping lives in boardstarter_internal and is never exposed.

create type public.user_role as enum ('employer', 'admin');
create type public.job_status as enum ('draft', 'pending_review', 'published', 'rejected', 'expired');
create type public.employment_type as enum (
  'full_time',
  'part_time',
  'contract',
  'temporary',
  'internship'
);
create type public.apply_mode as enum ('url', 'email', 'onsite');
create type public.order_status as enum ('pending', 'paid', 'refunded', 'failed', 'disputed');
create type public.alert_frequency as enum ('daily', 'weekly');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'employer',
  full_name text,
  company_id uuid,
  created_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default extensions.gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  logo_url text,
  website text,
  description text,
  location text,
  unlimited_until timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_company_id_fkey
  foreign key (company_id) references public.companies (id) on delete set null;

create table public.categories (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  sort integer not null default 0 check (sort >= 0)
);

create table public.tags (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.packages (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  duration_days integer not null check (duration_days > 0),
  is_featured boolean not null default false,
  ls_variant_id text not null unique,
  is_active boolean not null default true,
  sort integer not null default 0 check (sort >= 0)
);

create table public.jobs (
  id uuid primary key default extensions.gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 4 and 150),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description_md text not null check (char_length(trim(description_md)) > 0),
  category_id uuid not null references public.categories (id) on delete restrict,
  employment_type public.employment_type not null,
  location text,
  is_remote boolean not null default false,
  remote_region text,
  salary_min integer check (salary_min is null or salary_min >= 0),
  salary_max integer check (salary_max is null or salary_max >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  salary_period text not null default 'year'
    check (salary_period in ('hour', 'day', 'month', 'year')),
  apply_mode public.apply_mode not null,
  apply_url text,
  apply_email text,
  status public.job_status not null default 'draft',
  package_id uuid references public.packages (id) on delete set null,
  is_featured boolean not null default false,
  featured_until timestamptz,
  published_at timestamptz,
  expires_at timestamptz,
  views integer not null default 0 check (views >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  search tsvector generated always as (
    to_tsvector(
      'english'::regconfig,
      coalesce(title, '') || ' ' || coalesce(description_md, '') || ' ' ||
      coalesce(location, '') || ' ' || coalesce(remote_region, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_salary_range_check check (
    salary_min is null or salary_max is null or salary_max >= salary_min
  ),
  constraint jobs_published_dates_check check (
    status <> 'published' or (published_at is not null and expires_at is not null)
  )
);

create table public.job_tags (
  job_id uuid not null references public.jobs (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (job_id, tag_id)
);

create table public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete restrict,
  provider text not null check (char_length(trim(provider)) > 0),
  provider_order_id text not null unique,
  provider_customer_id text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status public.order_status not null default 'pending',
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.subscribers (
  id uuid primary key default extensions.gen_random_uuid(),
  email text not null check (char_length(trim(email)) between 3 and 320),
  categories uuid[] not null default '{}'::uuid[],
  frequency public.alert_frequency not null default 'weekly',
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default extensions.gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  email text not null check (char_length(trim(email)) between 3 and 320),
  resume_path text,
  message text,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  key text primary key check (char_length(trim(key)) between 1 and 120),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index subscribers_email_lower_key on public.subscribers (lower(email));
