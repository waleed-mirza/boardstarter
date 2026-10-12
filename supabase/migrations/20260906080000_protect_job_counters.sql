-- Counter columns are write-protected for every caller except the
-- security-definer increment_job_counter function and secret-key workflows.
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
    if new.views is distinct from old.views or new.clicks is distinct from old.clicks then
      raise exception 'views and clicks are managed by increment_job_counter';
    end if;
  end if;
  return new;
end;
$$;
