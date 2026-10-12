-- Keep the expiry timestamp truthful whenever a job transitions offline.
-- This also covers employer close actions and refund-driven expiration.
create or replace function public.expire_job_at_transition()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.status = 'expired'::public.job_status then
    new.expires_at := least(coalesce(new.expires_at, now()), now());
  end if;
  return new;
end;
$$;

drop trigger if exists jobs_expire_at_transition on public.jobs;
create trigger jobs_expire_at_transition
  before update on public.jobs
  for each row execute function public.expire_job_at_transition();
