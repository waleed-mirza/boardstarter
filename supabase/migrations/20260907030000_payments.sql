-- Week 6 payment safety boundary.
-- Provider callbacks are unauthenticated HTTP requests, so all protected
-- order/job transitions happen in service-role-only database functions.

alter table public.orders
  add column if not exists package_id uuid references public.packages (id) on delete set null,
  add column if not exists expected_amount_cents integer,
  add column if not exists amount_mismatch boolean not null default false,
  add column if not exists refunded_at timestamptz;

create table if not exists public.payment_webhook_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null check (char_length(trim(provider)) > 0),
  event_name text not null check (char_length(trim(event_name)) > 0),
  provider_order_id text not null check (char_length(trim(provider_order_id)) > 0),
  job_id uuid references public.jobs (id) on delete set null,
  result text not null check (char_length(trim(result)) > 0),
  raw jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  unique (provider, event_name, provider_order_id)
);

alter table public.payment_webhook_events enable row level security;

create policy payment_webhook_events_admin_select on public.payment_webhook_events
  for select to authenticated using (private.is_admin());

grant select on public.payment_webhook_events to authenticated;
grant all on public.payment_webhook_events to service_role;

-- Package selection and featured expiry are server-managed payment fields.
-- Employers choose a package through the action, but cannot write the fields
-- that a webhook later trusts.
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
    if new.views is distinct from old.views or new.clicks is distinct from old.clicks then
      raise exception 'views and clicks are managed by increment_job_counter';
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
  end if;
  return new;
end;
$$;

revoke update (package_id, featured_until) on public.jobs from authenticated;

create or replace function public.process_paid_order(
  p_provider text,
  p_job_id uuid,
  p_provider_order_id text,
  p_provider_customer_id text,
  p_package_id uuid,
  p_provider_variant_id text,
  p_amount_cents integer,
  p_currency text,
  p_raw jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
  v_order_id uuid;
  v_job public.jobs%rowtype;
  v_package public.packages%rowtype;
  v_mismatch boolean;
  v_auto_publish boolean;
  v_next_status public.job_status;
  v_start timestamptz;
  v_expires_at timestamptz;
begin
  select * into v_job
  from public.jobs
  where id = p_job_id
  for update;

  if not found then
    return jsonb_build_object('result', 'job_not_found', 'job_id', p_job_id);
  end if;

  select * into v_package
  from public.packages
  where (p_package_id is not null and id = p_package_id)
     or (p_provider_variant_id is not null and ls_variant_id = p_provider_variant_id)
  order by (case when p_package_id is not null and id = p_package_id then 0 else 1 end)
  limit 1;

  if not found
     or (p_package_id is not null and v_package.id <> p_package_id)
     or (p_provider_variant_id is not null and v_package.ls_variant_id <> p_provider_variant_id)
  then
    return jsonb_build_object('result', 'package_not_found', 'job_id', p_job_id);
  end if;

  insert into public.payment_webhook_events (
    provider, event_name, provider_order_id, job_id, result, raw
  ) values (
    p_provider, 'order_created', p_provider_order_id, p_job_id, 'processing', p_raw
  )
  on conflict (provider, event_name, provider_order_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('result', 'duplicate', 'job_id', p_job_id);
  end if;

  v_mismatch := upper(trim(p_currency)) <> upper(trim(v_package.currency))
    or p_amount_cents <> v_package.price_cents;

  insert into public.orders (
    job_id, package_id, provider, provider_order_id, provider_customer_id,
    amount_cents, expected_amount_cents, amount_mismatch, currency, status, raw
  ) values (
    p_job_id, v_package.id, p_provider, p_provider_order_id, p_provider_customer_id,
    p_amount_cents, v_package.price_cents, v_mismatch, upper(trim(p_currency)),
    case when v_mismatch then 'disputed'::public.order_status else 'paid'::public.order_status end,
    p_raw
  )
  on conflict (provider_order_id) do nothing
  returning id into v_order_id;

  if v_order_id is null then
    update public.payment_webhook_events
    set result = 'duplicate'
    where id = v_event_id;
    return jsonb_build_object('result', 'duplicate', 'job_id', p_job_id);
  end if;

  if v_mismatch then
    update public.payment_webhook_events
    set result = 'amount_mismatch'
    where id = v_event_id;
    return jsonb_build_object(
      'result', 'amount_mismatch',
      'job_id', p_job_id,
      'order_id', v_order_id,
      'expected_amount_cents', v_package.price_cents,
      'received_amount_cents', p_amount_cents
    );
  end if;

  -- A refund can arrive before the paid event. The durable ledger is a
  -- tombstone that prevents this late paid delivery from publishing.
  if exists (
    select 1 from public.payment_webhook_events
    where provider = p_provider
      and event_name = 'order_refunded'
      and provider_order_id = p_provider_order_id
  ) then
    update public.orders
    set status = 'refunded'::public.order_status,
        refunded_at = coalesce(refunded_at, now())
    where id = v_order_id;
    update public.jobs
    set status = 'expired'::public.job_status,
        expires_at = least(coalesce(expires_at, now()), now())
    where id = p_job_id;
    update public.payment_webhook_events
    set result = 'refunded_before_paid'
    where id = v_event_id;
    return jsonb_build_object('result', 'refunded_before_paid', 'job_id', p_job_id, 'order_id', v_order_id);
  end if;

  v_auto_publish := coalesce(
    (select value = 'true'::jsonb from public.site_settings where key = 'auto_publish_on_payment'),
    true
  );
  v_next_status := case
    when v_auto_publish then 'published'::public.job_status
    else 'pending_review'::public.job_status
  end;
  v_start := greatest(now(), coalesce(v_job.expires_at, now()));
  v_expires_at := v_start + make_interval(days => v_package.duration_days);

  update public.jobs
  set package_id = v_package.id,
      status = v_next_status,
      is_featured = v_package.is_featured,
      featured_until = case when v_package.is_featured then v_expires_at else null end,
      published_at = coalesce(v_job.published_at, now()),
      expires_at = v_expires_at
  where id = p_job_id;

  update public.payment_webhook_events
  set result = 'processed'
  where id = v_event_id;

  return jsonb_build_object(
    'result', 'processed',
    'job_id', p_job_id,
    'order_id', v_order_id,
    'expires_at', v_expires_at,
    'status', v_next_status
  );
end;
$$;

create or replace function public.process_refunded_order(
  p_provider text,
  p_provider_order_id text,
  p_job_id uuid,
  p_raw jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_id uuid;
  v_order public.orders%rowtype;
begin
  insert into public.payment_webhook_events (
    provider, event_name, provider_order_id, job_id, result, raw
  ) values (
    p_provider, 'order_refunded', p_provider_order_id, p_job_id, 'processing', p_raw
  )
  on conflict (provider, event_name, provider_order_id) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    return jsonb_build_object('result', 'duplicate');
  end if;

  select * into v_order
  from public.orders
  where provider = p_provider and provider_order_id = p_provider_order_id
  for update;

  if not found then
    update public.payment_webhook_events
    set result = 'deferred'
    where id = v_event_id;
    return jsonb_build_object('result', 'deferred');
  end if;

  update public.orders
  set status = 'refunded'::public.order_status,
      refunded_at = coalesce(refunded_at, now())
  where id = v_order.id;

  update public.jobs
  set status = 'expired'::public.job_status,
      expires_at = least(coalesce(expires_at, now()), now())
  where id = v_order.job_id;

  update public.payment_webhook_events
  set result = 'processed'
  where id = v_event_id;

  return jsonb_build_object('result', 'processed', 'job_id', v_order.job_id, 'order_id', v_order.id);
end;
$$;

revoke all on function public.process_paid_order(
  text, uuid, text, text, uuid, text, integer, text, jsonb
) from public, anon, authenticated;
revoke all on function public.process_refunded_order(text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.process_paid_order(
  text, uuid, text, text, uuid, text, integer, text, jsonb
) to service_role;
grant execute on function public.process_refunded_order(text, text, uuid, jsonb)
  to service_role;
