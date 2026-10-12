-- Keep the internal limiter table covered by the same public-table policy gate
-- while denying direct reads and writes to browser roles.
drop policy if exists rate_limits_no_direct_access on public.rate_limits;
create policy rate_limits_no_direct_access on public.rate_limits
  for all to anon, authenticated using (false) with check (false);
