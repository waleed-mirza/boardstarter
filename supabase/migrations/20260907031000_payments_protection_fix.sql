-- Forward fix: retain the Week 2 counter protection while adding the Week 6
-- package and featured-expiry protections.
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
    if new.package_id is distinct from old.package_id then
      raise exception 'package_id is managed by the payment or admin workflow';
    end if;
    if new.is_featured is distinct from old.is_featured then
      raise exception 'is_featured is managed by the payment or admin workflow';
    end if;
    if new.featured_until is distinct from old.featured_until then
      raise exception 'featured_until is managed by the payment or admin workflow';
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
