-- Admin subscriber management needs table privileges in addition to the
-- existing admin-only RLS policy. Anonymous visitors retain insert-only
-- signup access.
grant select, update, delete on public.subscribers to authenticated;
