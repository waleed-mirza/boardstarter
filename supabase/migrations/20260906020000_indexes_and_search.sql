create index jobs_status_published_at_idx
  on public.jobs (status, published_at desc);
create index jobs_category_id_idx on public.jobs (category_id);
create index jobs_is_remote_idx on public.jobs (is_remote);
create index jobs_expires_at_idx on public.jobs (expires_at);
create index jobs_search_idx on public.jobs using gin (search);
create index jobs_company_id_idx on public.jobs (company_id);
create index job_tags_tag_id_idx on public.job_tags (tag_id);
create index orders_job_id_idx on public.orders (job_id);
create index applications_job_id_idx on public.applications (job_id);
