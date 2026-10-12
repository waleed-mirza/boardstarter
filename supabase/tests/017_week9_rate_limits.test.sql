select plan(2);

select ok(
  (select public.consume_rate_limit('week9-rate-limit-test-key', 20, 3600)),
  'first request is allowed'
);

select is(
  (select count(*)::int
   from generate_series(1, 20) as request_no
   where public.consume_rate_limit('week9-rate-limit-test-key', 20, 3600)),
  19,
  'the twentieth request after the first is allowed and the next request is throttled'
);

select * from finish();
