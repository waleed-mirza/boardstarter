-- Supabase's service_role bypasses RLS, but still needs SQL privileges on
-- tables created by this project for webhook and cron work.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;
