-- Service-role workers own queue rows; the RLS policy alone does not grant
-- table privileges to the dedicated Supabase service role.
grant select, insert, update, delete on table public.email_queue to service_role;
