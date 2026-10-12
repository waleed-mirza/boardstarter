-- Week 3 task 6: atomic onboarding. Two PostgREST calls (insert company,
-- update profile) could leave an orphan company on a retry; a single
-- security-definer RPC keeps the link atomic. Guarded by pgTAP
-- supabase/tests/010_onboarding_rpc.test.sql.

create or replace function public.create_company_for_profile(
  p_name text,
  p_website text,
  p_location text,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_base text;
  v_slug text;
  v_suffix integer := 1;
  v_company uuid;
begin
  if v_user is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if exists (select 1 from public.profiles where id = v_user and company_id is not null) then
    raise exception 'a company is already linked to this profile' using errcode = 'P0001';
  end if;

  -- Same slug grammar as the companies table check constraint.
  v_base := trim(
    both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g')
  );
  if v_base = '' or v_base !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'company name cannot produce a valid slug' using errcode = 'P0001';
  end if;

  v_slug := v_base;
  while exists (select 1 from public.companies where slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base || '-' || v_suffix::text;
  end loop;

  insert into public.companies (owner_id, name, slug, website, location, description)
  values (v_user, trim(p_name), v_slug, p_website, p_location, p_description)
  returning id into v_company;

  update public.profiles
  set company_id = v_company
  where id = v_user and company_id is null;

  if not found then
    raise exception 'profile row missing for user' using errcode = 'P0001';
  end if;

  return v_company;
end;
$$;

revoke execute on function public.create_company_for_profile(text, text, text, text) from public, anon;
grant execute on function public.create_company_for_profile(text, text, text, text) to authenticated;
