-- Forward-only correction: expose the Week 8 pSEO threshold through the
-- existing admin settings RPC.
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
