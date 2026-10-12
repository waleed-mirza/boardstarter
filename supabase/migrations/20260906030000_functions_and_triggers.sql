create schema if not exists private;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.email)), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Existing accounts must receive the same profile guarantee as new accounts.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger jobs_touch_updated_at
  before update on public.jobs
  for each row execute function public.touch_updated_at();

create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

create or replace function public.reject_protected_job_updates()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user not like 'postgres%'
     and current_user not in ('service_role', 'supabase_admin')
     and coalesce(auth.role(), '') <> 'service_role'
  then
    if new.status is distinct from old.status then
      raise exception 'status is managed by the payment or admin workflow';
    end if;
    if new.is_featured is distinct from old.is_featured then
      raise exception 'is_featured is managed by the payment or admin workflow';
    end if;
    if new.published_at is distinct from old.published_at then
      raise exception 'published_at is managed by the payment or admin workflow';
    end if;
    if new.expires_at is distinct from old.expires_at then
      raise exception 'expires_at is managed by the payment or admin workflow';
    end if;
  end if;
  return new;
end;
$$;

create trigger jobs_reject_protected_updates
  before update on public.jobs
  for each row execute function public.reject_protected_job_updates();

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'admin'::public.user_role
  );
$$;

create or replace function public.increment_job_counter(
  p_job_id uuid,
  p_kind text
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_value integer;
begin
  if p_kind not in ('views', 'clicks') then
    raise exception 'counter kind must be views or clicks';
  end if;

  if p_kind = 'views' then
    update public.jobs
      set views = views + 1
      where id = p_job_id
        and status = 'published'::public.job_status
        and expires_at > now()
      returning views into next_value;
  else
    update public.jobs
      set clicks = clicks + 1
      where id = p_job_id
        and status = 'published'::public.job_status
        and expires_at > now()
      returning clicks into next_value;
  end if;

  return next_value;
end;
$$;
