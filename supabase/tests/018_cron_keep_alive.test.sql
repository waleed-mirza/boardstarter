select plan(2);

set local role service_role;

select ok(
  has_function_privilege('service_role', 'public.get_public_board_stats()', 'execute'),
  'service_role can execute the keep-alive board-stats RPC'
);

select ok(
  (public.get_public_board_stats()->>'jobCount') is not null,
  'service_role can invoke the keep-alive board-stats RPC'
);

select * from finish();
