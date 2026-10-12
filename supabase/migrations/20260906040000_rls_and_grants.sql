alter table public.profiles enable row level security;
alter table public.companies enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.packages enable row level security;
alter table public.jobs enable row level security;
alter table public.job_tags enable row level security;
alter table public.orders enable row level security;
alter table public.subscribers enable row level security;
alter table public.applications enable row level security;
alter table public.site_settings enable row level security;

-- Profiles: role and company membership are never self-editable.
create policy profiles_owner_select on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_owner_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all on public.profiles
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Companies are private until a later public-safe company projection is added.
create policy companies_owner_select on public.companies
  for select to authenticated using (owner_id = auth.uid());
create policy companies_owner_insert on public.companies
  for insert to authenticated with check (owner_id = auth.uid());
create policy companies_owner_update on public.companies
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy companies_owner_delete on public.companies
  for delete to authenticated using (owner_id = auth.uid());
create policy companies_admin_all on public.companies
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Taxonomy and active packages are public reads; writes are admin-only.
create policy categories_public_select on public.categories
  for select to anon, authenticated using (true);
create policy categories_admin_all on public.categories
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy tags_public_select on public.tags
  for select to anon, authenticated using (true);
create policy tags_admin_all on public.tags
  for all to authenticated using (private.is_admin()) with check (private.is_admin());
create policy packages_public_select on public.packages
  for select to anon, authenticated using (is_active = true or private.is_admin());
create policy packages_admin_all on public.packages
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Public jobs are live only. Owners additionally see their own workflow rows.
create policy jobs_public_select on public.jobs
  for select to anon, authenticated using (
    status = 'published'::public.job_status
    and published_at <= now()
    and expires_at > now()
  );
create policy jobs_owner_select on public.jobs
  for select to authenticated using (
    exists (
      select 1 from public.companies c
      where c.id = jobs.company_id and c.owner_id = auth.uid()
    )
  );
create policy jobs_owner_insert on public.jobs
  for insert to authenticated with check (
    exists (
      select 1 from public.companies c
      where c.id = jobs.company_id and c.owner_id = auth.uid()
    )
  );
create policy jobs_owner_update on public.jobs
  for update to authenticated using (
    exists (
      select 1 from public.companies c
      where c.id = jobs.company_id and c.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.companies c
      where c.id = jobs.company_id and c.owner_id = auth.uid()
    )
  );
create policy jobs_owner_delete on public.jobs
  for delete to authenticated using (
    exists (
      select 1 from public.companies c
      where c.id = jobs.company_id and c.owner_id = auth.uid()
    )
  );
create policy jobs_admin_all on public.jobs
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy job_tags_public_select on public.job_tags
  for select to anon, authenticated using (
    exists (
      select 1 from public.jobs j
      where j.id = job_tags.job_id
        and j.status = 'published'::public.job_status
        and j.published_at <= now()
        and j.expires_at > now()
    )
  );
create policy job_tags_owner_all on public.job_tags
  for all to authenticated using (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = job_tags.job_id and c.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = job_tags.job_id and c.owner_id = auth.uid()
    )
  );
create policy job_tags_admin_all on public.job_tags
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy orders_owner_select on public.orders
  for select to authenticated using (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = orders.job_id and c.owner_id = auth.uid()
    )
  );
create policy orders_admin_all on public.orders
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy subscribers_signup on public.subscribers
  for insert to anon, authenticated with check (
    confirmed_at is null and unsubscribed_at is null and last_sent_at is null
  );
create policy subscribers_admin_all on public.subscribers
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy applications_public_insert on public.applications
  for insert to anon, authenticated with check (
    exists (
      select 1 from public.jobs j
      where j.id = applications.job_id
        and j.status = 'published'::public.job_status
        and j.published_at <= now()
        and j.expires_at > now()
    )
  );
create policy applications_owner_select on public.applications
  for select to authenticated using (
    exists (
      select 1 from public.jobs j
      join public.companies c on c.id = j.company_id
      where j.id = applications.job_id and c.owner_id = auth.uid()
    )
  );
create policy applications_admin_all on public.applications
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy site_settings_public_select on public.site_settings
  for select to anon, authenticated using (true);
create policy site_settings_admin_all on public.site_settings
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- Remove the old public migration tracker if an earlier Week 1 runner created it.
drop table if exists public._migrations_applied;

grant usage on schema private to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function public.increment_job_counter(uuid, text) to anon, authenticated;

grant select on public.profiles to authenticated;
grant select on public.profiles to anon;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.companies to authenticated;
grant select on public.categories, public.tags, public.packages to anon, authenticated;
grant select, insert, update, delete on public.categories, public.tags, public.packages to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select on public.jobs to anon;
grant update (
  company_id, title, slug, description_md, category_id, employment_type, location,
  is_remote, remote_region, salary_min, salary_max, currency, salary_period,
  apply_mode, apply_url, apply_email, package_id, featured_until, views, clicks,
  updated_at
) on public.jobs to authenticated;
grant select, insert, update, delete on public.job_tags to authenticated;
grant select on public.job_tags to anon;
grant select on public.orders to authenticated;
grant select on public.orders to anon;
grant insert on public.subscribers, public.applications to anon, authenticated;
grant select on public.subscribers, public.applications to anon;
grant select on public.site_settings to anon, authenticated;
grant select, insert, update, delete on public.site_settings to authenticated;
