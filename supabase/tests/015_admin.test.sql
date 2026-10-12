-- Week 7 admin boundary: security-definer mutations, reassignment workflows,
-- and the durable audit trail. Every statement runs in a transaction that the
-- test runner rolls back.
select plan(26);

create temporary table week7_ids (
  paid_job uuid,
  free_job uuid,
  reject_job uuid,
  source_category uuid,
  target_category uuid,
  source_tag uuid,
  target_tag uuid,
  package_id uuid
);
insert into week7_ids default values;
grant all on table week7_ids to authenticated;

insert into public.jobs (
  company_id, title, slug, description_md, category_id, employment_type,
  location, is_remote, currency, salary_period, apply_mode, apply_url,
  status, package_id, expires_at
)
select c.id, 'Week 7 paid moderation job', 'week-7-paid-moderation-job',
  'A dedicated listing used by the Week 7 admin contract.', cat.id,
  'full_time', 'Remote', true, 'USD', 'year', 'url',
  'https://example.test/week-7', 'pending_review', p.id, now() + interval '30 days'
from public.companies c
join public.categories cat on cat.slug = 'software-engineering'
join public.packages p on p.ls_variant_id = 'standard-listing-30'
where c.slug = 'northstar-labs'
returning id;
update week7_ids set paid_job = (select id from public.jobs where slug = 'week-7-paid-moderation-job');

insert into public.orders (
  job_id, package_id, provider, provider_order_id, amount_cents,
  expected_amount_cents, amount_mismatch, currency, status, raw
)
select paid_job, p.id, 'test', 'week-7-admin-order', p.price_cents,
  p.price_cents, false, p.currency, 'paid', '{}'::jsonb
from week7_ids, public.packages p
where p.ls_variant_id = 'standard-listing-30';

insert into public.jobs (
  company_id, title, slug, description_md, category_id, employment_type,
  is_remote, currency, salary_period, apply_mode, apply_url, status
)
select c.id, 'Week 7 deletable job', 'week-7-deletable-job',
  'A dedicated listing used to prove the destructive confirmation boundary.', cat.id,
  'full_time', true, 'USD', 'year', 'url', 'https://example.test/week-7-delete', 'draft'
from public.companies c
join public.categories cat on cat.slug = 'software-engineering'
where c.slug = 'northstar-labs'
returning id;
update week7_ids set free_job = (select id from public.jobs where slug = 'week-7-deletable-job');

insert into public.jobs (
  company_id, title, slug, description_md, category_id, employment_type,
  is_remote, currency, salary_period, apply_mode, apply_email, status
)
select c.id, 'Week 7 rejection job', 'week-7-rejection-job',
  'A dedicated listing used to prove moderated rejection is durable.', cat.id,
  'full_time', true, 'USD', 'year', 'email', 'jobs@example.test', 'pending_review'
from public.companies c
join public.categories cat on cat.slug = 'data'
where c.slug = 'cobalt-research'
returning id;
update week7_ids set reject_job = (select id from public.jobs where slug = 'week-7-rejection-job');

insert into public.categories (name, slug, description, sort)
values ('Week 7 Source Category', 'week-7-source-category', 'Temporary source.', 9000)
returning id;
update week7_ids set source_category = (select id from public.categories where slug = 'week-7-source-category');

insert into public.categories (name, slug, description, sort)
values ('Week 7 Target Category', 'week-7-target-category', 'Temporary target.', 9001)
returning id;
update week7_ids set target_category = (select id from public.categories where slug = 'week-7-target-category');

insert into public.jobs (
  company_id, title, slug, description_md, category_id, employment_type,
  is_remote, currency, salary_period, apply_mode, apply_url, status
)
select c.id, 'Week 7 category reassignment job', 'week-7-category-reassignment-job',
  'A dedicated listing used to prove category reassignment.', source_category,
  'full_time', true, 'USD', 'year', 'url', 'https://example.test/week-7-category', 'draft'
from public.companies c, week7_ids
where c.slug = 'northstar-labs';

insert into public.tags (name, slug)
values ('Week 7 Source Tag', 'week-7-source-tag')
returning id;
update week7_ids set source_tag = (select id from public.tags where slug = 'week-7-source-tag');

insert into public.tags (name, slug)
values ('Week 7 Target Tag', 'week-7-target-tag')
returning id;
update week7_ids set target_tag = (select id from public.tags where slug = 'week-7-target-tag');

insert into public.job_tags (job_id, tag_id)
select (select paid_job from week7_ids), source_tag from week7_ids;

insert into public.packages (
  name, price_cents, currency, duration_days, is_featured, ls_variant_id, is_active, sort
)
values ('Week 7 temporary package', 100, 'USD', 7, false, 'week-7-temporary-package', false, 9999)
returning id;
update week7_ids set package_id = (select id from public.packages where ls_variant_id = 'week-7-temporary-package');

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id::text from auth.users where email = 'admin@example.test'),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

select is((public.admin_approve_job((select paid_job from week7_ids)) ->> 'ok'), 'true', 'admin approves a paid pending job');
select is((select status::text from public.jobs where id = (select paid_job from week7_ids)), 'published', 'approval publishes the job');
select is((select count(*)::int from public.admin_actions where action = 'job.approve' and target_id = (select paid_job::text from week7_ids)), 1, 'approval writes an audit row');
select is((public.admin_set_job_featured((select paid_job from week7_ids), true) ->> 'ok'), 'true', 'admin can feature a live job');
select is((select is_featured from public.jobs where id = (select paid_job from week7_ids)), true, 'featured marker is persisted');
select is((public.admin_extend_job((select paid_job from week7_ids), 7) ->> 'ok'), 'true', 'admin can extend a live job');
select is((public.admin_force_expire_job((select paid_job from week7_ids)) ->> 'ok'), 'true', 'admin can force-expire a job');
select is((select status::text from public.jobs where id = (select paid_job from week7_ids)), 'expired', 'force-expire removes the live state');
select is((public.admin_reject_job((select reject_job from week7_ids), 'Needs a clearer scope.') ->> 'ok'), 'true', 'admin can reject with a reason');
select is((select rejection_reason from public.jobs where id = (select reject_job from week7_ids)), 'Needs a clearer scope.', 'rejection reason is retained');
select is((select count(*)::int from public.admin_actions where action = 'job.reject' and target_id = (select reject_job::text from week7_ids)), 1, 'rejection writes an audit row');
select is((public.admin_delete_job((select free_job from week7_ids)) ->> 'ok'), 'true', 'admin can delete a job without payment history');
select is((select count(*)::int from public.jobs where id = (select free_job from week7_ids)), 0, 'deleted job is gone');
select is((public.admin_delete_package((select id from public.packages where ls_variant_id = 'standard-listing-30')) ->> 'ok'), 'false', 'packages in use cannot be deleted');
select is((public.admin_delete_package((select package_id from week7_ids)) ->> 'ok'), 'true', 'unused packages can be deleted');
select is((public.admin_delete_category((select source_category from week7_ids)) ->> 'ok'), 'false', 'category deletion requires reassignment when jobs use it');
select is((public.admin_delete_category((select source_category from week7_ids), (select target_category from week7_ids)) ->> 'ok'), 'true', 'admin can delete a category with reassignment');
select is((select count(*)::int from public.jobs where slug = 'week-7-category-reassignment-job' and category_id = (select target_category from week7_ids)), 1, 'category reassignment preserves jobs');
select is((public.admin_merge_tag((select source_tag from week7_ids), (select target_tag from week7_ids)) ->> 'ok'), 'true', 'admin can merge tags');
select is((select count(*)::int from public.job_tags where job_id = (select paid_job from week7_ids) and tag_id = (select target_tag from week7_ids)), 1, 'tag merge reassigns job links');
select is((select count(*)::int from public.tags where id = (select source_tag from week7_ids)), 0, 'merged source tag is removed');
select is((public.admin_update_site_settings(jsonb_build_object('accent', 'violet')) ->> 'ok'), 'true', 'admin can update site settings');
select is((select value from public.site_settings where key = 'accent'), '"violet"'::jsonb, 'site setting value is updated');
select ok((select count(*)::int from public.admin_actions where action = 'settings.update') > 0, 'settings update writes an audit row');

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id::text from public.profiles where full_name = 'Employer A'),
    'role', 'authenticated'
  )::text,
  true
);
select throws_ok(
  $$select public.admin_force_expire_job((select paid_job from week7_ids))$$,
  '42501',
  null,
  'employers cannot call admin mutation RPCs'
);
select is((select count(*)::int from public.admin_actions), 0, 'employers cannot read or write the admin audit trail');

select * from finish();
