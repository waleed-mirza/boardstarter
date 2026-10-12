-- Week 5 employer posting safeguards.
-- Employer writes may edit content, but publication and counters remain
-- server-managed. The close RPC is the only employer status transition.

create or replace function public.force_employer_job_draft_defaults()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if current_user not like 'postgres%'
     and current_user not in ('service_role', 'supabase_admin')
     and coalesce(auth.role(), '') <> 'service_role'
  then
    new.status := 'draft'::public.job_status;
    new.package_id := null;
    new.is_featured := false;
    new.featured_until := null;
    new.published_at := null;
    new.expires_at := null;
    new.views := 0;
    new.clicks := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_force_employer_draft on public.jobs;
create trigger jobs_force_employer_draft
  before insert on public.jobs
  for each row execute function public.force_employer_job_draft_defaults();

-- These checks make direct API writes obey the title and application-target
-- parts of the shared Zod contract. Description length remains a server-side
-- schema rule because the seed includes intentionally concise legacy rows.
alter table public.jobs
  drop constraint if exists jobs_title_check;
alter table public.jobs
  add constraint jobs_title_length_check
  check (char_length(trim(title)) between 4 and 100);

alter table public.jobs
  add constraint jobs_apply_target_check
  check (
    (apply_mode = 'url' and apply_url is not null and char_length(trim(apply_url)) > 0)
    or (apply_mode = 'email' and apply_email is not null and char_length(trim(apply_email)) > 0)
    or (apply_mode = 'onsite')
  );

-- The generic employer update trigger intentionally blocks status/expiry.
-- This SECURITY DEFINER function is the narrowly-scoped exception for a
-- destructive owner action; it never accepts a caller-supplied target state.
create or replace function public.close_employer_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return false;
  end if;

  update public.jobs j
  set status = 'expired'::public.job_status,
      expires_at = coalesce(j.expires_at, now())
  where j.id = p_job_id
    and j.status <> 'expired'::public.job_status
    and exists (
      select 1
      from public.companies c
      where c.id = j.company_id and c.owner_id = auth.uid()
    );

  return found;
end;
$$;

revoke execute on function public.close_employer_job(uuid) from public;
grant execute on function public.close_employer_job(uuid) to authenticated;

-- Employers may display application totals for their own jobs; RLS remains
-- the ownership boundary.
grant select on public.applications to authenticated;
