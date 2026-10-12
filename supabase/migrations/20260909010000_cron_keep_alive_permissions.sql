-- The keep-alive cron route uses the server-only service-role client.  The
-- public board migration is intentionally restrictive and grants this RPC to
-- anon/authenticated only, so add the explicit service-role privilege here.
grant execute on function public.get_public_board_stats() to service_role;
