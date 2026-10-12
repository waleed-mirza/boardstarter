-- Week 8: SEO catalog, subscriber lifecycle, and durable email automation.
-- The queue is intentionally service-role owned; public callers use the
-- narrow subscriber RPCs below and never receive queue rows or raw tokens.

create table if not exists public.email_queue (
  id uuid primary key default extensions.gen_random_uuid(),
  to_email text not null check (char_length(trim(to_email)) between 3 and 320),
  template text not null check (template in ('alert_confirmation', 'job_digest', 'job_live', 'job_expiry', 'job_pending_review')),
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0 check (attempts >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  dedupe_key text not null unique,
  claimed_at timestamptz,
  claim_token uuid,
  provider_message_id text
);

alter table public.email_queue enable row level security;

create policy email_queue_service_role_all on public.email_queue
  for all to service_role using (true) with check (true);

create index if not exists email_queue_due_idx
  on public.email_queue (scheduled_for, created_at)
  where sent_at is null;
create index if not exists email_queue_claim_idx
  on public.email_queue (claimed_at)
  where sent_at is null;

-- A buyer-configurable threshold controls whether a pSEO page is indexable.
insert into public.site_settings (key, value)
values ('pseo_min_live_jobs', '3'::jsonb)
on conflict (key) do nothing;

create or replace function public.subscribe_to_alerts(
  p_email text,
  p_categories uuid[] default '{}'::uuid[],
  p_frequency public.alert_frequency default 'weekly'::public.alert_frequency
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_email text := lower(trim(p_email));
  v_token text := encode(extensions.gen_random_bytes(24), 'hex');
  v_id uuid;
begin
  if char_length(v_email) < 3 or char_length(v_email) > 320 then
    raise exception 'A valid email address is required.' using errcode = '22023';
  end if;
  if p_categories is null then
    p_categories := '{}'::uuid[];
  end if;

  insert into public.subscribers (email, categories, frequency, token, confirmed_at, unsubscribed_at, last_sent_at)
  values (v_email, p_categories, p_frequency, v_token, null, null, null)
  on conflict ((lower(email))) do update
    set categories = excluded.categories,
        frequency = excluded.frequency,
        token = excluded.token,
        confirmed_at = null,
        unsubscribed_at = null,
        last_sent_at = null;

  select id into v_id from public.subscribers where lower(email) = v_email;
  insert into public.email_queue (to_email, template, payload, dedupe_key)
  values (
    v_email,
    'alert_confirmation',
    jsonb_build_object('email', v_email, 'token', v_token),
    'alert-confirm:' || v_id::text || ':' || v_token
  );
  -- Return only an opaque identity. The confirmation token stays in the
  -- service-owned queue and is delivered only through the confirmation email.
  return jsonb_build_object('id', v_id, 'email', v_email);
end;
$$;

create or replace function public.confirm_alert_subscription(
  p_email text,
  p_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_updated integer;
begin
  update public.subscribers
  set confirmed_at = now(),
      unsubscribed_at = null,
      last_sent_at = null,
      token = encode(extensions.gen_random_bytes(24), 'hex')
  where lower(email) = lower(trim(p_email))
    and token = p_token
    and confirmed_at is null
    and unsubscribed_at is null;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.unsubscribe_alert_subscription(
  p_email text,
  p_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_updated integer;
begin
  update public.subscribers
  set unsubscribed_at = now()
  where lower(email) = lower(trim(p_email))
    and token = p_token
    and confirmed_at is not null
    and unsubscribed_at is null;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function private.enqueue_job_status_email()
returns trigger
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_owner_email text;
  v_company_name text;
  v_company_slug text;
  v_category_name text;
  v_category_slug text;
  v_payload jsonb;
  v_template text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select u.email, c.name, c.slug, cat.name, cat.slug
    into v_owner_email, v_company_name, v_company_slug, v_category_name, v_category_slug
  from public.companies c
  join auth.users u on u.id = c.owner_id
  join public.categories cat on cat.id = new.category_id
  where c.id = new.company_id;

  if new.status = 'published'::public.job_status and v_owner_email is not null then
    v_template := 'job_live';
    v_payload := jsonb_build_object(
      'jobId', new.id,
      'title', new.title,
      'slug', new.slug,
      'companyName', v_company_name,
      'companySlug', v_company_slug,
      'categoryName', v_category_name,
      'categorySlug', v_category_slug,
      'expiresAt', new.expires_at
    );
    insert into public.email_queue (to_email, template, payload, dedupe_key)
    values (v_owner_email, v_template, v_payload, 'job-live:' || new.id::text || ':' || coalesce(new.published_at::text, 'unknown'))
    on conflict (dedupe_key) do nothing;
  elsif new.status = 'pending_review'::public.job_status then
    v_template := 'job_pending_review';
    v_payload := jsonb_build_object(
      'jobId', new.id,
      'title', new.title,
      'slug', new.slug,
      'companyName', v_company_name,
      'companySlug', v_company_slug,
      'categoryName', v_category_name,
      'categorySlug', v_category_slug
    );
    for v_owner_email in
      select u.email
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.role = 'admin'::public.user_role and u.email is not null
    loop
      insert into public.email_queue (to_email, template, payload, dedupe_key)
      values (v_owner_email, v_template, v_payload, 'job-pending-review:' || new.id::text || ':' || v_owner_email)
      on conflict (dedupe_key) do nothing;
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_status_email_queue on public.jobs;
create trigger jobs_status_email_queue
after update of status on public.jobs
for each row execute function private.enqueue_job_status_email();

create or replace function public.expire_due_jobs()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_jobs jsonb;
begin
  with expired as (
    update public.jobs
    set status = 'expired'::public.job_status,
        is_featured = false,
        featured_until = null
    where status = 'published'::public.job_status
      and expires_at is not null
      and expires_at <= now()
    returning id, slug, expires_at
  )
  select coalesce(jsonb_agg(to_jsonb(expired) order by slug), '[]'::jsonb)
    into v_jobs
  from expired;
  return jsonb_build_object('expired', v_jobs);
end;
$$;

create or replace function public.enqueue_due_digests()
returns integer
language plpgsql
security definer
set search_path = public, auth, extensions, pg_temp
as $$
declare
  v_count integer := 0;
  v_sub record;
  v_jobs jsonb;
  v_period timestamptz;
  v_key text;
begin
  for v_sub in
    select s.*
    from public.subscribers s
    where s.confirmed_at is not null
      and s.unsubscribed_at is null
      and (
        s.last_sent_at is null
        or (s.frequency = 'daily'::public.alert_frequency and s.last_sent_at < date_trunc('day', now()))
        or (s.frequency = 'weekly'::public.alert_frequency and s.last_sent_at < date_trunc('week', now()))
      )
  loop
    v_period := case when v_sub.frequency = 'daily'::public.alert_frequency
      then date_trunc('day', now()) else date_trunc('week', now()) end;
    v_key := 'digest:' || v_sub.id::text || ':' || to_char(v_period at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', j.id,
      'title', j.title,
      'slug', j.slug,
      'companyName', c.name,
      'companySlug', c.slug,
      'categoryName', cat.name,
      'categorySlug', cat.slug,
      'location', j.location,
      'isRemote', j.is_remote,
      'salaryMin', j.salary_min,
      'salaryMax', j.salary_max,
      'currency', j.currency,
      'salaryPeriod', j.salary_period,
      'publishedAt', j.published_at
    ) order by j.published_at desc), '[]'::jsonb)
      into v_jobs
    from public.jobs j
    join public.companies c on c.id = j.company_id
    join public.categories cat on cat.id = j.category_id
    where j.status = 'published'::public.job_status
      and j.published_at <= now()
      and j.expires_at > now()
      and (v_sub.last_sent_at is null or j.published_at > v_sub.last_sent_at)
      and (coalesce(cardinality(v_sub.categories), 0) = 0 or j.category_id = any(v_sub.categories));

    if jsonb_array_length(v_jobs) > 0 then
      insert into public.email_queue (to_email, template, payload, scheduled_for, dedupe_key)
      values (
        v_sub.email,
        'job_digest',
        jsonb_build_object('subscriberId', v_sub.id, 'email', v_sub.email, 'token', v_sub.token, 'frequency', v_sub.frequency, 'jobs', v_jobs),
        now(),
        v_key
      )
      on conflict (dedupe_key) do nothing;
      if found then v_count := v_count + 1; end if;
    end if;
  end loop;
  return v_count;
end;
$$;

create or replace function public.enqueue_renewal_nudges()
returns integer
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_count integer := 0;
  v_job record;
begin
  for v_job in
    select j.id, j.title, j.slug, j.expires_at, c.name as company_name, c.slug as company_slug, u.email
    from public.jobs j
    join public.companies c on c.id = j.company_id
    join auth.users u on u.id = c.owner_id
    where j.status = 'published'::public.job_status
      and j.expires_at > now() + interval '3 days'
      and j.expires_at <= now() + interval '4 days'
      and u.email is not null
  loop
    insert into public.email_queue (to_email, template, payload, dedupe_key)
    values (
      v_job.email,
      'job_expiry',
      jsonb_build_object('jobId', v_job.id, 'title', v_job.title, 'slug', v_job.slug, 'companyName', v_job.company_name, 'companySlug', v_job.company_slug, 'expiresAt', v_job.expires_at),
      'job-expiry:' || v_job.id::text || ':' || to_char(v_job.expires_at at time zone 'UTC', 'YYYY-MM-DD')
    )
    on conflict (dedupe_key) do nothing;
    if found then v_count := v_count + 1; end if;
  end loop;
  return v_count;
end;
$$;

create or replace function public.claim_email_queue(
  p_limit integer default 25,
  p_claim_token uuid default extensions.gen_random_uuid()
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_available integer;
  v_rows jsonb;
begin
  -- Reserve the daily cap while claiming so overlapping cron invocations
  -- cannot both observe the same remaining capacity.
  perform pg_advisory_xact_lock(hashtext('boardstarter-email-daily-cap'));
  select greatest(0, 100 - count(*)::integer)
    into v_available
  from public.email_queue
  where coalesce(sent_at, claimed_at) >= date_trunc('day', now());

  with candidates as (
    select id
    from public.email_queue
    where sent_at is null
      and scheduled_for <= now()
      and attempts < 5
      and (claimed_at is null or claimed_at < now() - interval '15 minutes')
    order by scheduled_for, created_at
    for update skip locked
    limit least(greatest(coalesce(p_limit, 25), 1), greatest(v_available, 0))
  ), claimed as (
    update public.email_queue q
    set claimed_at = now(), claim_token = p_claim_token, attempts = q.attempts + 1
    from candidates c
    where q.id = c.id
    returning q.*
  )
  select coalesce(jsonb_agg(to_jsonb(claimed) order by scheduled_for, created_at), '[]'::jsonb)
    into v_rows
  from claimed;
  return jsonb_build_object('claimToken', p_claim_token, 'items', v_rows);
end;
$$;

create or replace function public.mark_email_sent(
  p_id uuid,
  p_claim_token uuid,
  p_provider_message_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_template text;
  v_subscriber_id uuid;
  v_updated integer;
begin
  update public.email_queue
  set sent_at = now(),
      claimed_at = null,
      claim_token = null,
      provider_message_id = p_provider_message_id,
      last_error = null
  where id = p_id and claim_token = p_claim_token and sent_at is null
  returning template, (payload->>'subscriberId')::uuid into v_template, v_subscriber_id;
  get diagnostics v_updated = row_count;
  if v_updated = 1 and v_template = 'job_digest' and v_subscriber_id is not null then
    update public.subscribers set last_sent_at = now() where id = v_subscriber_id and unsubscribed_at is null;
  end if;
  return v_updated = 1;
end;
$$;

create or replace function public.mark_email_failed(
  p_id uuid,
  p_claim_token uuid,
  p_error text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_updated integer;
begin
  update public.email_queue
  set claimed_at = null,
      claim_token = null,
      last_error = left(coalesce(p_error, 'Email delivery failed.'), 2000)
  where id = p_id and claim_token = p_claim_token and sent_at is null;
  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.get_public_seo_catalog()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  with live as (
    select
      j.id, j.title, j.slug, j.description_md, j.category_id, cat.name as category_name,
      cat.slug as category_slug, j.employment_type, j.location, j.is_remote, j.remote_region,
      j.salary_min, j.salary_max, j.currency, j.salary_period, j.apply_mode, j.apply_url,
      j.apply_email, j.published_at, j.expires_at, j.updated_at,
      c.name as company_name, c.slug as company_slug, c.logo_url as company_logo_url,
      c.website as company_website, c.location as company_location,
      coalesce(array_agg(distinct t.slug) filter (where t.slug is not null), '{}'::text[]) as tag_slugs
    from public.jobs j
    join public.companies c on c.id = j.company_id
    join public.categories cat on cat.id = j.category_id
    left join public.job_tags jt on jt.job_id = j.id
    left join public.tags t on t.id = jt.tag_id
    where j.status = 'published'::public.job_status
      and j.published_at <= now()
      and j.expires_at > now()
    group by j.id, cat.name, cat.slug, c.name, c.slug, c.logo_url, c.website, c.location
  )
  select jsonb_build_object(
    'jobs', coalesce((select jsonb_agg(to_jsonb(live) order by published_at desc, id) from live), '[]'::jsonb),
    'latestPublishedAt', (select max(published_at) from live)
  );
$$;

revoke all on table public.email_queue from anon, authenticated;
revoke all on function public.claim_email_queue(integer, uuid) from public, anon, authenticated;
revoke all on function public.mark_email_sent(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.mark_email_failed(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.expire_due_jobs() from public, anon, authenticated;
revoke all on function public.enqueue_due_digests() from public, anon, authenticated;
revoke all on function public.enqueue_renewal_nudges() from public, anon, authenticated;
revoke all on function public.get_public_seo_catalog() from public, anon, authenticated;

grant execute on function public.subscribe_to_alerts(text, uuid[], public.alert_frequency) to anon, authenticated;
grant execute on function public.confirm_alert_subscription(text, text) to anon, authenticated;
grant execute on function public.unsubscribe_alert_subscription(text, text) to anon, authenticated;
grant execute on function public.claim_email_queue(integer, uuid) to service_role;
grant execute on function public.mark_email_sent(uuid, uuid, text) to service_role;
grant execute on function public.mark_email_failed(uuid, uuid, text) to service_role;
grant execute on function public.expire_due_jobs() to service_role;
grant execute on function public.enqueue_due_digests() to service_role;
grant execute on function public.enqueue_renewal_nudges() to service_role;
grant execute on function public.get_public_seo_catalog() to service_role, anon, authenticated;

create or replace function public.admin_update_site_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_key text;
  v_value jsonb;
  v_keys jsonb;
  v_allowed text[] := array[
    'site_name', 'tagline', 'logo_url', 'accent', 'preset', 'default_currency',
    'allowed_apply_modes', 'auto_publish_on_payment', 'alert_frequency',
    'footer_links', 'analytics_snippet', 'pseo_min_live_jobs'
  ];
begin
  perform private.require_admin();
  if jsonb_typeof(p_settings) <> 'object' then
    return jsonb_build_object('ok', false, 'error', 'Settings must be an object.');
  end if;
  for v_key, v_value in select key, value from jsonb_each(p_settings) loop
    if not (v_key = any(v_allowed)) then
      return jsonb_build_object('ok', false, 'error', 'Unknown setting: ' || v_key);
    end if;
    insert into public.site_settings (key, value) values (v_key, v_value)
    on conflict (key) do update set value = excluded.value;
  end loop;
  select coalesce(jsonb_agg(key order by key), '[]'::jsonb)
    into v_keys
    from jsonb_object_keys(p_settings) as setting_keys(key);
  perform private.record_admin_action(
    'settings.update', 'site_settings', 'settings', jsonb_build_object('keys', v_keys)
  );
  return jsonb_build_object('ok', true, 'keys', v_keys);
end;
$$;

revoke all on function public.admin_update_site_settings(jsonb) from public, anon;
grant execute on function public.admin_update_site_settings(jsonb) to authenticated;
