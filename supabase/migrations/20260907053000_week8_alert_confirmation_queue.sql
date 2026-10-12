-- Harden alert double opt-in: the confirmation nonce is generated inside the
-- database and only appears in the service-owned email queue payload.
drop function if exists public.subscribe_to_alerts(text, uuid[], public.alert_frequency, text);

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
  return jsonb_build_object('id', v_id, 'email', v_email);
end;
$$;

grant execute on function public.subscribe_to_alerts(text, uuid[], public.alert_frequency)
  to anon, authenticated;
