-- Anonymous data-layer calls should receive an empty RLS result for private
-- rows instead of a privilege error.
grant select on public.companies to anon;
