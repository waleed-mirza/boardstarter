-- Week 8: alert lifecycle, queue claims, expiry idempotency, and SEO projection.
select plan(19);

set local role service_role;

create temporary table week8_state (
  subscriber_id uuid,
  claim_token uuid,
  initial_token text
);

select ok(
  (public.subscribe_to_alerts(
    'week8-alert@example.test',
    array[(select id from public.categories order by sort limit 1)],
    'daily'::public.alert_frequency
  )->>'id') is not null,
  'subscribe RPC creates an opaque subscriber identity'
);

insert into week8_state (subscriber_id, initial_token)
select id, token from public.subscribers where email = 'week8-alert@example.test';

select is(
  (select confirmed_at from public.subscribers where id = (select subscriber_id from week8_state)),
  null::timestamptz,
  'new alert subscribers remain unconfirmed'
);

select is(
  (select count(*)::int from public.email_queue
   where template = 'alert_confirmation' and to_email = 'week8-alert@example.test'),
  1,
  'subscribe RPC queues confirmation delivery without exposing its token'
);

select public.subscribe_to_alerts('week8-repeat@example.test', '{}'::uuid[], 'weekly'::public.alert_frequency);
select public.subscribe_to_alerts('week8-repeat@example.test', '{}'::uuid[], 'weekly'::public.alert_frequency);
select is(
  (select count(*)::int from public.email_queue
   where template = 'alert_confirmation'
     and to_email = 'week8-repeat@example.test'
     and sent_at is null),
  1,
  'resubscribing replaces stale unsent confirmation messages'
);

select is(
  public.enqueue_due_digests(),
  0,
  'unconfirmed subscribers never receive a digest'
);

select is(
  public.confirm_alert_subscription(
    'week8-alert@example.test',
    (select initial_token from week8_state)
  ),
  true,
  'the confirmation token activates the subscriber'
);

select ok(
  (select confirmed_at is not null from public.subscribers where id = (select subscriber_id from week8_state)),
  'confirmed subscriber records confirmation time'
);

select is(
  public.confirm_alert_subscription('week8-alert@example.test', (select initial_token from week8_state)),
  false,
  'confirmation token is single-use'
);

select is(
  public.unsubscribe_alert_subscription('week8-alert@example.test', 'wrong-token'),
  false,
  'unsubscribe rejects an invalid token'
);

select is(
  public.unsubscribe_alert_subscription(
    'week8-alert@example.test',
    (select token from public.subscribers where id = (select subscriber_id from week8_state))
  ),
  true,
  'unsubscribe accepts the rotated token'
);

select ok(
  (select unsubscribed_at is not null from public.subscribers where id = (select subscriber_id from week8_state)),
  'unsubscribe records the opt-out timestamp'
);

-- Keep the queue-claim fixture focused on a single work item.
-- The integration database is reused between pgTAP runs, so clear prior
-- fixtures before asserting the exact claim count.
delete from public.email_queue;

insert into public.email_queue (to_email, template, payload, scheduled_for, dedupe_key)
values ('week8-queue@example.test', 'job_live', '{"jobId":"week8"}', now(), 'week8-queue-item');

insert into week8_state (claim_token) values ('00000000-0000-0000-0000-000000000008');

select is(
  jsonb_array_length((public.claim_email_queue(10, (select claim_token from week8_state where claim_token is not null))->'items')::jsonb),
  1,
  'queue claim returns due work'
);

select is(
  (select attempts from public.email_queue where dedupe_key = 'week8-queue-item'),
  1,
  'queue claim increments attempts'
);

select is(
  public.mark_email_sent(
    (select id from public.email_queue where dedupe_key = 'week8-queue-item'),
    (select claim_token from week8_state where claim_token is not null),
    'provider-week8'
  ),
  true,
  'queue item can be marked sent by its claimant'
);

select is(
  public.mark_email_sent(
    (select id from public.email_queue where dedupe_key = 'week8-queue-item'),
    (select claim_token from week8_state where claim_token is not null),
    'provider-week8-replay'
  ),
  false,
  'a sent queue item cannot be marked twice'
);

insert into public.jobs (
  company_id, title, slug, description_md, category_id, employment_type,
  is_remote, currency, salary_period, apply_mode, apply_url, status,
  published_at, expires_at
)
select c.id, 'Week 8 due expiry job', 'week-8-due-expiry-job', 'Temporary expiry fixture.', cat.id,
  'full_time', true, 'USD', 'year', 'url', 'https://example.test/week8', 'published',
  now() - interval '2 days', now() - interval '1 minute'
from public.companies c
join public.categories cat on cat.slug = 'software-engineering'
where c.slug = 'northstar-labs';

select is(
  jsonb_array_length((public.expire_due_jobs()->'expired')::jsonb),
  1,
  'expiry task changes exactly the due job'
);

select is(
  (select status::text from public.jobs where slug = 'week-8-due-expiry-job'),
  'expired',
  'due job is marked expired and no longer live'
);

select is(
  jsonb_array_length((public.expire_due_jobs()->'expired')::jsonb),
  0,
  'running expiry again is idempotent'
);

select ok(
  (select count(*)::int from jsonb_array_elements((public.get_public_seo_catalog()->'jobs')::jsonb) item
   where item->>'status' is not null) = 0,
  'public SEO projection exposes only its public fields'
);

select * from finish();
