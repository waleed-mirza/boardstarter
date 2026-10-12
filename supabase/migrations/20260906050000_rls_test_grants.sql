-- Keep SELECT privileges broad enough for anonymous policy tests to assert a
-- zero-row result instead of a privilege error. RLS remains the enforcement
-- boundary and no read policy is granted for these private tables.
grant select on public.profiles, public.companies, public.orders, public.subscribers, public.applications to anon;
