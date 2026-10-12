-- Week 9: durable, serverless-safe public write throttling.
create table if not exists public.rate_limits (
  key text primary key check (char_length(key) between 16 and 200),
  window_started timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
create policy rate_limits_no_direct_access on public.rate_limits
  for all to anon, authenticated using (false) with check (false);

create or replace function public.consume_rate_limit(
  p_key text,
  p_limit integer default 20,
  p_window_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.rate_limits%rowtype;
begin
  if p_key is null or char_length(p_key) < 16 or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;
  insert into public.rate_limits (key, window_started, request_count, updated_at)
    values (p_key, now(), 1, now())
    on conflict (key) do update
      set request_count = case
        when now() - public.rate_limits.window_started >= make_interval(secs => p_window_seconds)
          then 1
        else public.rate_limits.request_count + 1
      end,
      window_started = case
        when now() - public.rate_limits.window_started >= make_interval(secs => p_window_seconds)
          then now()
        else public.rate_limits.window_started
      end,
      updated_at = now()
    returning * into v_row;
  return v_row.request_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to anon, authenticated;
