-- Week 6 payment transition and privilege contract.
select plan(26);

set local role service_role;

select is(
  (public.process_paid_order(
    'lemonsqueezy',
    (select id from public.jobs where slug = 'qa-automation-engineer'),
    'tap-paid-order-1',
    'tap-customer-1',
    (select id from public.packages where ls_variant_id = 'standard-listing-30'),
    'standard-listing-30',
    4900,
    'USD',
    '{"source":"pgTAP"}'::jsonb
  )->>'result'),
  'processed',
  'a paid order is processed exactly once'
);

select is(
  (select status::text from public.jobs where slug = 'qa-automation-engineer'),
  'published',
  'a paid job is published when auto-publish is enabled'
);

select is(
  (select is_featured from public.jobs where slug = 'qa-automation-engineer'),
  false,
  'publication derives featured state from the selected package'
);

select is(
  (select status::text from public.orders where provider_order_id = 'tap-paid-order-1'),
  'paid',
  'the order row records the paid status'
);

select is(
  (select package_id from public.orders where provider_order_id = 'tap-paid-order-1'),
  (select id from public.packages where ls_variant_id = 'standard-listing-30'),
  'the order freezes the package used for payment'
);

select is(
  (public.process_paid_order(
    'lemonsqueezy',
    (select id from public.jobs where slug = 'qa-automation-engineer'),
    'tap-paid-order-1',
    'tap-customer-1',
    (select id from public.packages where ls_variant_id = 'standard-listing-30'),
    'standard-listing-30',
    4900,
    'USD',
    '{"source":"pgTAP","retry":true}'::jsonb
  )->>'result'),
  'duplicate',
  'a duplicate paid delivery is a no-op'
);

select is(
  (public.process_paid_order(
    'lemonsqueezy',
    (select id from public.jobs where slug = 'controls-engineer-lumen'),
    'tap-mismatch-1',
    null,
    (select id from public.packages where ls_variant_id = 'standard-listing-30'),
    'standard-listing-30',
    1,
    'USD',
    '{"source":"pgTAP","tampered":true}'::jsonb
  )->>'result'),
  'amount_mismatch',
  'a package amount mismatch is recorded and flagged'
);

select is(
  (select status::text from public.orders where provider_order_id = 'tap-mismatch-1'),
  'disputed',
  'a mismatched payment is disputed'
);

select is(
  (select status::text from public.jobs where slug = 'controls-engineer-lumen'),
  'draft',
  'a mismatched payment cannot publish a job'
);

update public.site_settings set value = 'false'::jsonb where key = 'auto_publish_on_payment';

select is(
  (public.process_paid_order(
    'lemonsqueezy',
    (select id from public.jobs where slug = 'research-data-engineer-cobalt'),
    'tap-review-1',
    null,
    (select id from public.packages where ls_variant_id = 'featured-listing-30'),
    'featured-listing-30',
    7900,
    'USD',
    '{"source":"pgTAP","review":true}'::jsonb
  )->>'result'),
  'processed',
  'a paid order is processed when auto-publish is disabled'
);

select is(
  (select status::text from public.jobs where slug = 'research-data-engineer-cobalt'),
  'pending_review',
  'auto-publish off sends paid jobs to pending review'
);

select is(
  (select is_featured from public.jobs where slug = 'research-data-engineer-cobalt'),
  true,
  'featured placement is still derived while review is pending'
);

select is(
  (public.process_refunded_order(
    'lemonsqueezy', 'tap-paid-order-1', null, '{"source":"pgTAP"}'::jsonb
  )->>'result'),
  'processed',
  'a refund marks the order and expires its job'
);

select is(
  (select status::text from public.orders where provider_order_id = 'tap-paid-order-1'),
  'refunded',
  'the refunded order is marked refunded'
);

select is(
  (select status::text from public.jobs where slug = 'qa-automation-engineer'),
  'expired',
  'a refunded job is expired'
);

select ok(
  (select expires_at from public.jobs where slug = 'qa-automation-engineer') <= now(),
  'a refunded job expires immediately'
);

select is(
  (public.process_refunded_order(
    'lemonsqueezy', 'tap-refund-first-1',
    (select id from public.jobs where slug = 'product-design-intern'),
    '{"source":"pgTAP","refund_first":true}'::jsonb
  )->>'result'),
  'deferred',
  'a refund arriving before its order is durably deferred'
);

select is(
  (public.process_paid_order(
    'lemonsqueezy',
    (select id from public.jobs where slug = 'product-design-intern'),
    'tap-refund-first-1',
    null,
    (select id from public.packages where ls_variant_id = 'standard-listing-30'),
    'standard-listing-30',
    4900,
    'USD',
    '{"source":"pgTAP","late_paid":true}'::jsonb
  )->>'result'),
  'refunded_before_paid',
  'a late paid delivery cannot override an earlier refund'
);

select is(
  (select count(*)::int from public.orders where provider_order_id = 'tap-refund-first-1'),
  1,
  'refund-first handling creates only one final order row'
);

select is(
  (public.process_paid_order(
    'lemonsqueezy', '00000000-0000-0000-0000-000000000000', 'tap-missing-job-1',
    null, null, 'standard-listing-30', 4900, 'USD', '{}'::jsonb
  )->>'result'),
  'job_not_found',
  'a missing job creates no order'
);

select is(
  (public.process_paid_order(
    'lemonsqueezy',
    (select id from public.jobs where slug = 'senior-react-engineer-orchard'),
    'tap-renew-first-1',
    null,
    (select id from public.packages where ls_variant_id = 'standard-listing-30'),
    'standard-listing-30',
    4900,
    'USD',
    '{"source":"pgTAP","renewal":1}'::jsonb
  )->>'result'),
  'processed',
  'a new paid order renews an already live job'
);

select ok(
  (select expires_at from public.jobs where slug = 'senior-react-engineer-orchard')
    > now() + interval '50 days',
  'the first renewal extends expiry beyond the original term'
);

select is(
  (public.process_paid_order(
    'lemonsqueezy',
    (select id from public.jobs where slug = 'senior-react-engineer-orchard'),
    'tap-renew-first-1',
    null,
    (select id from public.packages where ls_variant_id = 'standard-listing-30'),
    'standard-listing-30',
    4900,
    'USD',
    '{"source":"pgTAP","renewal":1,"retry":true}'::jsonb
  )->>'result'),
  'duplicate',
  'retrying a renewal does not extend it twice'
);

select is(
  (public.process_paid_order(
    'lemonsqueezy',
    (select id from public.jobs where slug = 'senior-react-engineer-orchard'),
    'tap-renew-second-1',
    null,
    (select id from public.packages where ls_variant_id = 'standard-listing-30'),
    'standard-listing-30',
    4900,
    'USD',
    '{"source":"pgTAP","renewal":2}'::jsonb
  )->>'result'),
  'processed',
  'a second provider order creates a separate renewal'
);

select ok(
  (select expires_at from public.jobs where slug = 'senior-react-engineer-orchard')
    > now() + interval '80 days',
  'a second renewal extends from the current expiry'
);

set local role authenticated;

select is(
  has_function_privilege(
    'authenticated',
    'public.process_refunded_order(text,text,uuid,jsonb)',
    'execute'
  ),
  false,
  'authenticated callers cannot execute the refund transition'
);

select * from finish();
