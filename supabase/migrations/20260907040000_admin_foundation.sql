-- Week 7: admin audit trail, moderation state, and protected admin writes.
-- Admin mutations run through security-definer functions added in the next
-- migration.  The functions still require private.is_admin(), so the
-- elevated database owner is never exposed to the browser.

alter table public.jobs
  add column if not exists rejection_reason text
    check (rejection_reason is null or char_length(trim(rejection_reason)) between 3 and 2000);

create table if not exists public.admin_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete restrict,
  action text not null check (char_length(trim(action)) between 1 and 120),
  target_type text not null check (char_length(trim(target_type)) between 1 and 80),
  target_id text not null check (char_length(trim(target_id)) between 1 and 120),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

create policy admin_actions_admin_select on public.admin_actions
  for select to authenticated using (private.is_admin());

create index if not exists admin_actions_created_at_idx
  on public.admin_actions (created_at desc);
create index if not exists admin_actions_target_idx
  on public.admin_actions (target_type, target_id, created_at desc);
create index if not exists jobs_admin_status_created_idx
  on public.jobs (status, created_at desc);

grant select on public.admin_actions to authenticated;

-- Package and order history is part of the financial ledger.  A package may
-- be deactivated, but it must not be removed underneath an existing record.
alter table public.jobs drop constraint if exists jobs_package_id_fkey;
alter table public.jobs
  add constraint jobs_package_id_fkey
  foreign key (package_id) references public.packages (id) on delete restrict;

alter table public.orders drop constraint if exists orders_package_id_fkey;
alter table public.orders
  add constraint orders_package_id_fkey
  foreign key (package_id) references public.packages (id) on delete restrict;

-- Week 6 protects payment-owned columns from employers.  Admin moderation is
-- an intentional, separately authorized workflow and is allowed through the
-- security-definer RPC boundary.
create or replace function public.reject_protected_job_updates()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  if current_user not like 'postgres%'
     and current_user not in ('service_role', 'supabase_admin')
     and coalesce(auth.role(), '') <> 'service_role'
     and not private.is_admin()
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

create or replace function private.record_admin_action(
  p_action text,
  p_target_type text,
  p_target_id text,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if not private.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  insert into public.admin_actions (actor_id, action, target_type, target_id, meta)
  values (auth.uid(), p_action, p_target_type, p_target_id, coalesce(p_meta, '{}'::jsonb));
end;
$$;

revoke all on function private.record_admin_action(text, text, text, jsonb)
  from public, anon, authenticated;

