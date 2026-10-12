-- Week 7: atomic admin mutation boundary.

create or replace function private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.require_admin() from public, anon, authenticated;

create or replace function public.admin_approve_job(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_job public.jobs%rowtype;
begin
  perform private.require_admin();
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;
  if v_job.status <> 'pending_review'::public.job_status then
    return jsonb_build_object('ok', false, 'error', 'Only pending jobs can be approved.');
  end if;
  if v_job.expires_at is null or v_job.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'This job has no active paid listing period.');
  end if;
  if not exists (
    select 1 from public.orders
    where job_id = p_job_id and status = 'paid'::public.order_status and not amount_mismatch
  ) then
    return jsonb_build_object('ok', false, 'error', 'A paid order is required before publishing.');
  end if;

  update public.jobs
  set status = 'published'::public.job_status,
      published_at = coalesce(published_at, now()),
      rejection_reason = null
  where id = p_job_id;

  perform private.record_admin_action(
    'job.approve', 'job', p_job_id::text,
    jsonb_build_object('previous_status', v_job.status)
  );
  return jsonb_build_object('ok', true, 'job_id', p_job_id, 'status', 'published');
end;
$$;

create or replace function public.admin_reject_job(p_job_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_job public.jobs%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  perform private.require_admin();
  if char_length(v_reason) < 3 then
    return jsonb_build_object('ok', false, 'error', 'A rejection reason is required.');
  end if;
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;
  if v_job.status <> 'pending_review'::public.job_status then
    return jsonb_build_object('ok', false, 'error', 'Only pending jobs can be rejected.');
  end if;

  update public.jobs
  set status = 'rejected'::public.job_status,
      rejection_reason = v_reason,
      is_featured = false,
      featured_until = null
  where id = p_job_id;

  perform private.record_admin_action(
    'job.reject', 'job', p_job_id::text,
    jsonb_build_object('previous_status', v_job.status, 'reason', v_reason)
  );
  return jsonb_build_object('ok', true, 'job_id', p_job_id, 'status', 'rejected');
end;
$$;

create or replace function public.admin_set_job_featured(p_job_id uuid, p_featured boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_job public.jobs%rowtype;
begin
  perform private.require_admin();
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;
  if p_featured and (v_job.status <> 'published'::public.job_status or v_job.expires_at is null or v_job.expires_at <= now()) then
    return jsonb_build_object('ok', false, 'error', 'Only a live job can be featured.');
  end if;

  update public.jobs
  set is_featured = p_featured,
      featured_until = case when p_featured then v_job.expires_at else null end
  where id = p_job_id;
  perform private.record_admin_action(
    case when p_featured then 'job.feature' else 'job.unfeature' end,
    'job', p_job_id::text,
    jsonb_build_object('previous_featured', v_job.is_featured)
  );
  return jsonb_build_object('ok', true, 'job_id', p_job_id, 'is_featured', p_featured);
end;
$$;

create or replace function public.admin_extend_job(p_job_id uuid, p_days integer)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_job public.jobs%rowtype;
  v_expires_at timestamptz;
begin
  perform private.require_admin();
  if p_days is null or p_days < 1 or p_days > 365 then
    return jsonb_build_object('ok', false, 'error', 'Extension must be between 1 and 365 days.');
  end if;
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;
  if v_job.status <> 'published'::public.job_status or v_job.expires_at is null then
    return jsonb_build_object('ok', false, 'error', 'Only a live job can be extended.');
  end if;
  v_expires_at := greatest(v_job.expires_at, now()) + make_interval(days => p_days);
  update public.jobs
  set expires_at = v_expires_at,
      featured_until = case when is_featured then v_expires_at else null end
  where id = p_job_id;
  perform private.record_admin_action(
    'job.extend', 'job', p_job_id::text,
    jsonb_build_object('days', p_days, 'previous_expires_at', v_job.expires_at, 'expires_at', v_expires_at)
  );
  return jsonb_build_object('ok', true, 'job_id', p_job_id, 'expires_at', v_expires_at);
end;
$$;

create or replace function public.admin_force_expire_job(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_job public.jobs%rowtype;
begin
  perform private.require_admin();
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;
  update public.jobs
  set status = 'expired'::public.job_status,
      expires_at = least(coalesce(expires_at, now()), now()),
      is_featured = false,
      featured_until = null
  where id = p_job_id;
  perform private.record_admin_action(
    'job.force_expire', 'job', p_job_id::text,
    jsonb_build_object('previous_status', v_job.status)
  );
  return jsonb_build_object('ok', true, 'job_id', p_job_id, 'status', 'expired');
end;
$$;

create or replace function public.admin_delete_job(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_job public.jobs%rowtype;
begin
  perform private.require_admin();
  select * into v_job from public.jobs where id = p_job_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Job not found.');
  end if;
  if exists (select 1 from public.orders where job_id = p_job_id) then
    return jsonb_build_object('ok', false, 'error', 'Jobs with payment history cannot be deleted; force-expire it instead.');
  end if;
  delete from public.jobs where id = p_job_id;
  perform private.record_admin_action(
    'job.delete', 'job', p_job_id::text,
    jsonb_build_object('title', v_job.title, 'previous_status', v_job.status)
  );
  return jsonb_build_object('ok', true, 'job_id', p_job_id);
end;
$$;

create or replace function public.admin_upsert_package(
  p_id uuid,
  p_name text,
  p_price_cents integer,
  p_currency text,
  p_duration_days integer,
  p_is_featured boolean,
  p_ls_variant_id text,
  p_is_active boolean,
  p_sort integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_id uuid;
  v_action text;
begin
  perform private.require_admin();
  if p_id is null then
    insert into public.packages (name, price_cents, currency, duration_days, is_featured, ls_variant_id, is_active, sort)
    values (trim(p_name), p_price_cents, upper(trim(p_currency)), p_duration_days, p_is_featured, trim(p_ls_variant_id), p_is_active, p_sort)
    returning id into v_id;
    v_action := 'package.create';
  else
    update public.packages
    set name = trim(p_name), price_cents = p_price_cents, currency = upper(trim(p_currency)),
        duration_days = p_duration_days, is_featured = p_is_featured,
        ls_variant_id = trim(p_ls_variant_id), is_active = p_is_active, sort = p_sort
    where id = p_id
    returning id into v_id;
    if v_id is null then
      return jsonb_build_object('ok', false, 'error', 'Package not found.');
    end if;
    v_action := 'package.update';
  end if;
  perform private.record_admin_action(v_action, 'package', v_id::text, jsonb_build_object('name', trim(p_name)));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.admin_delete_package(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_package public.packages%rowtype;
begin
  perform private.require_admin();
  select * into v_package from public.packages where id = p_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'Package not found.');
  end if;
  if exists (select 1 from public.jobs where package_id = p_id)
     or exists (select 1 from public.orders where package_id = p_id) then
    return jsonb_build_object('ok', false, 'error', 'This package is in use. Deactivate it instead of deleting it.');
  end if;
  delete from public.packages where id = p_id;
  perform private.record_admin_action('package.delete', 'package', p_id::text, jsonb_build_object('name', v_package.name));
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

create or replace function public.admin_upsert_category(
  p_id uuid, p_name text, p_slug text, p_description text, p_sort integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_id uuid;
  v_action text;
begin
  perform private.require_admin();
  if p_id is null then
    insert into public.categories (name, slug, description, sort)
    values (trim(p_name), lower(trim(p_slug)), nullif(trim(p_description), ''), p_sort)
    returning id into v_id;
    v_action := 'category.create';
  else
    update public.categories
    set name = trim(p_name), slug = lower(trim(p_slug)), description = nullif(trim(p_description), ''), sort = p_sort
    where id = p_id returning id into v_id;
    if v_id is null then return jsonb_build_object('ok', false, 'error', 'Category not found.'); end if;
    v_action := 'category.update';
  end if;
  perform private.record_admin_action(v_action, 'category', v_id::text, jsonb_build_object('name', trim(p_name), 'slug', lower(trim(p_slug))));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.admin_merge_category(p_source_id uuid, p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_source public.categories%rowtype;
  v_target public.categories%rowtype;
begin
  perform private.require_admin();
  if p_source_id = p_target_id then return jsonb_build_object('ok', false, 'error', 'Choose a different target.'); end if;
  select * into v_source from public.categories where id = p_source_id for update;
  select * into v_target from public.categories where id = p_target_id for update;
  if v_source.id is null or v_target.id is null then return jsonb_build_object('ok', false, 'error', 'Category not found.'); end if;
  update public.jobs set category_id = p_target_id where category_id = p_source_id;
  delete from public.categories where id = p_source_id;
  perform private.record_admin_action('category.merge', 'category', p_source_id::text, jsonb_build_object('target_id', p_target_id, 'target_name', v_target.name));
  return jsonb_build_object('ok', true, 'id', p_source_id, 'target_id', p_target_id);
end;
$$;

create or replace function public.admin_delete_category(p_id uuid, p_reassign_to uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_category public.categories%rowtype;
  v_count integer;
begin
  perform private.require_admin();
  select * into v_category from public.categories where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Category not found.'); end if;
  select count(*)::integer into v_count from public.jobs where category_id = p_id;
  if v_count > 0 and (p_reassign_to is null or p_reassign_to = p_id) then
    return jsonb_build_object('ok', false, 'error', 'Reassignment is required before deleting this category.', 'jobs_count', v_count);
  end if;
  if v_count > 0 then
    if not exists (select 1 from public.categories where id = p_reassign_to) then
      return jsonb_build_object('ok', false, 'error', 'The reassignment category was not found.');
    end if;
    update public.jobs set category_id = p_reassign_to where category_id = p_id;
  end if;
  delete from public.categories where id = p_id;
  perform private.record_admin_action('category.delete', 'category', p_id::text, jsonb_build_object('name', v_category.name, 'reassigned_to', p_reassign_to, 'jobs_count', v_count));
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

create or replace function public.admin_upsert_tag(p_id uuid, p_name text, p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_id uuid;
  v_action text;
begin
  perform private.require_admin();
  if p_id is null then
    insert into public.tags (name, slug) values (trim(p_name), lower(trim(p_slug))) returning id into v_id;
    v_action := 'tag.create';
  else
    update public.tags set name = trim(p_name), slug = lower(trim(p_slug)) where id = p_id returning id into v_id;
    if v_id is null then return jsonb_build_object('ok', false, 'error', 'Tag not found.'); end if;
    v_action := 'tag.update';
  end if;
  perform private.record_admin_action(v_action, 'tag', v_id::text, jsonb_build_object('name', trim(p_name), 'slug', lower(trim(p_slug))));
  return jsonb_build_object('ok', true, 'id', v_id);
end;
$$;

create or replace function public.admin_merge_tag(p_source_id uuid, p_target_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_source public.tags%rowtype;
  v_target public.tags%rowtype;
begin
  perform private.require_admin();
  if p_source_id = p_target_id then return jsonb_build_object('ok', false, 'error', 'Choose a different target.'); end if;
  select * into v_source from public.tags where id = p_source_id for update;
  select * into v_target from public.tags where id = p_target_id for update;
  if v_source.id is null or v_target.id is null then return jsonb_build_object('ok', false, 'error', 'Tag not found.'); end if;
  insert into public.job_tags (job_id, tag_id)
  select job_id, p_target_id from public.job_tags where tag_id = p_source_id on conflict do nothing;
  delete from public.job_tags where tag_id = p_source_id;
  delete from public.tags where id = p_source_id;
  perform private.record_admin_action('tag.merge', 'tag', p_source_id::text, jsonb_build_object('target_id', p_target_id, 'target_name', v_target.name));
  return jsonb_build_object('ok', true, 'id', p_source_id, 'target_id', p_target_id);
end;
$$;

create or replace function public.admin_delete_tag(p_id uuid, p_reassign_to uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_tag public.tags%rowtype;
  v_count integer;
begin
  perform private.require_admin();
  select * into v_tag from public.tags where id = p_id for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'Tag not found.'); end if;
  select count(*)::integer into v_count from public.job_tags where tag_id = p_id;
  if v_count > 0 and (p_reassign_to is null or p_reassign_to = p_id) then
    return jsonb_build_object('ok', false, 'error', 'Reassignment is required before deleting this tag.', 'jobs_count', v_count);
  end if;
  if v_count > 0 then
    if not exists (select 1 from public.tags where id = p_reassign_to) then
      return jsonb_build_object('ok', false, 'error', 'The reassignment tag was not found.');
    end if;
    insert into public.job_tags (job_id, tag_id)
    select job_id, p_reassign_to from public.job_tags where tag_id = p_id on conflict do nothing;
  end if;
  delete from public.job_tags where tag_id = p_id;
  delete from public.tags where id = p_id;
  perform private.record_admin_action('tag.delete', 'tag', p_id::text, jsonb_build_object('name', v_tag.name, 'reassigned_to', p_reassign_to, 'jobs_count', v_count));
  return jsonb_build_object('ok', true, 'id', p_id);
end;
$$;

create or replace function public.admin_update_site_settings(p_settings jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_key text;
  v_value jsonb;
  v_allowed text[] := array[
    'site_name', 'tagline', 'logo_url', 'accent', 'preset', 'default_currency',
    'allowed_apply_modes', 'auto_publish_on_payment', 'alert_frequency',
    'footer_links', 'analytics_snippet'
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
  perform private.record_admin_action('settings.update', 'site_settings', 'settings', jsonb_build_object('keys', jsonb_object_keys(p_settings)));
  return jsonb_build_object('ok', true, 'keys', jsonb_object_keys(p_settings));
end;
$$;

revoke all on function public.admin_approve_job(uuid) from public, anon;
revoke all on function public.admin_reject_job(uuid, text) from public, anon;
revoke all on function public.admin_set_job_featured(uuid, boolean) from public, anon;
revoke all on function public.admin_extend_job(uuid, integer) from public, anon;
revoke all on function public.admin_force_expire_job(uuid) from public, anon;
revoke all on function public.admin_delete_job(uuid) from public, anon;
revoke all on function public.admin_upsert_package(uuid, text, integer, text, integer, boolean, text, boolean, integer) from public, anon;
revoke all on function public.admin_delete_package(uuid) from public, anon;
revoke all on function public.admin_upsert_category(uuid, text, text, text, integer) from public, anon;
revoke all on function public.admin_merge_category(uuid, uuid) from public, anon;
revoke all on function public.admin_delete_category(uuid, uuid) from public, anon;
revoke all on function public.admin_upsert_tag(uuid, text, text) from public, anon;
revoke all on function public.admin_merge_tag(uuid, uuid) from public, anon;
revoke all on function public.admin_delete_tag(uuid, uuid) from public, anon;
revoke all on function public.admin_update_site_settings(jsonb) from public, anon;

grant execute on function public.admin_approve_job(uuid) to authenticated;
grant execute on function public.admin_reject_job(uuid, text) to authenticated;
grant execute on function public.admin_set_job_featured(uuid, boolean) to authenticated;
grant execute on function public.admin_extend_job(uuid, integer) to authenticated;
grant execute on function public.admin_force_expire_job(uuid) to authenticated;
grant execute on function public.admin_delete_job(uuid) to authenticated;
grant execute on function public.admin_upsert_package(uuid, text, integer, text, integer, boolean, text, boolean, integer) to authenticated;
grant execute on function public.admin_delete_package(uuid) to authenticated;
grant execute on function public.admin_upsert_category(uuid, text, text, text, integer) to authenticated;
grant execute on function public.admin_merge_category(uuid, uuid) to authenticated;
grant execute on function public.admin_delete_category(uuid, uuid) to authenticated;
grant execute on function public.admin_upsert_tag(uuid, text, text) to authenticated;
grant execute on function public.admin_merge_tag(uuid, uuid) to authenticated;
grant execute on function public.admin_delete_tag(uuid, uuid) to authenticated;
grant execute on function public.admin_update_site_settings(jsonb) to authenticated;

