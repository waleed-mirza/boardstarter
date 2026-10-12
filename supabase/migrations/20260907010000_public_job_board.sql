-- Week 4 public board projections.
--
-- The base tables intentionally remain private for company data and for
-- workflow rows. These SECURITY DEFINER functions expose only the public
-- projection needed by the board. They are deliberately JSON-shaped so the
-- projection can evolve without exposing generated table columns.

create or replace function public.search_public_jobs(
  p_filters jsonb default '{}'::jsonb,
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 20), 1), 100);
  v_offset integer;
begin
  v_offset := (v_page - 1) * v_page_size;

  return (
    with base as (
      select
        j.id,
        j.company_id,
        j.title,
        j.slug,
        j.category_id,
        cat.name as category_name,
        cat.slug as category_slug,
        j.employment_type,
        j.location,
        j.is_remote,
        j.remote_region,
        j.salary_min,
        j.salary_max,
        j.currency,
        j.salary_period,
        j.is_featured,
        (j.is_featured and coalesce(j.featured_until, v_now) > v_now) as effective_featured,
        j.published_at,
        j.expires_at,
        j.created_at,
        c.name as company_name,
        c.slug as company_slug,
        c.logo_url as company_logo_url,
        coalesce(array_agg(distinct t.slug) filter (where t.slug is not null), '{}'::text[]) as tag_slugs
      from public.jobs j
      join public.companies c on c.id = j.company_id
      join public.categories cat on cat.id = j.category_id
      left join public.job_tags jt on jt.job_id = j.id
      left join public.tags t on t.id = jt.tag_id
      where j.status = 'published'::public.job_status
        and j.published_at <= v_now
        and j.expires_at > v_now
      group by j.id, cat.name, cat.slug, c.name, c.slug, c.logo_url
    ),
    filtered as (
      select b.*
      from base b
      where (
        not (p_filters ? 'query')
        or nullif(trim(left(p_filters->>'query', 500)), '') is null
        or (
          numnode(websearch_to_tsquery('english', left(p_filters->>'query', 500))) > 0
          and b.id in (
            select j2.id
            from public.jobs j2
            where j2.id = b.id
              and j2.search @@ websearch_to_tsquery('english', left(p_filters->>'query', 500))
          )
        )
      )
      and (
        coalesce(jsonb_array_length(p_filters->'categories'), 0) = 0
        or b.category_slug in (select jsonb_array_elements_text(p_filters->'categories'))
      )
      and (
        coalesce(jsonb_array_length(p_filters->'employmentTypes'), 0) = 0
        or b.employment_type::text in (select jsonb_array_elements_text(p_filters->'employmentTypes'))
      )
      and (
        not (p_filters ? 'remote')
        or b.is_remote = (p_filters->>'remote')::boolean
      )
      and (
        not (p_filters ? 'location')
        or position(lower(p_filters->>'location') in lower(coalesce(b.location, ''))) > 0
      )
      and (
        coalesce(jsonb_array_length(p_filters->'tags'), 0) = 0
        or b.tag_slugs && (select array_agg(value) from jsonb_array_elements_text(p_filters->'tags') as values(value))
      )
      and (
        not (p_filters ? 'tag')
        or p_filters->>'tag' = any(b.tag_slugs)
      )
      and (
        not (p_filters ? 'companySlug')
        or b.company_slug = p_filters->>'companySlug'
      )
      and (
        not (p_filters ? 'categorySlug')
        or b.category_slug = p_filters->>'categorySlug'
      )
      and (
        not (p_filters ? 'featuredOnly')
        or b.effective_featured = (p_filters->>'featuredOnly')::boolean
      )
      and (
        not (p_filters ? 'salaryBand')
        or case p_filters->>'salaryBand'
          when 'under-75k' then coalesce(b.salary_min, 0) < 75000
          when '75k-100k' then coalesce(b.salary_min, 0) >= 75000 and coalesce(b.salary_min, 0) < 100000
          when '100k-150k' then coalesce(b.salary_min, 0) >= 100000 and coalesce(b.salary_min, 0) < 150000
          when '150k-plus' then coalesce(b.salary_min, 0) >= 150000
          else false
        end
      )
    ),
    counted as (
      select count(*)::integer as total from filtered
    ),
    paged as (
      select f.*, row_number() over (
        order by
          f.effective_featured desc,
          case when p_filters->>'sort' = 'salary' then f.salary_max end desc nulls last,
          case when coalesce(p_filters->>'sort', 'newest') <> 'salary' then f.published_at end desc,
          f.published_at desc,
          f.id
      ) as result_order
      from filtered f
      order by
        f.effective_featured desc,
        case when p_filters->>'sort' = 'salary' then f.salary_max end desc nulls last,
        case when coalesce(p_filters->>'sort', 'newest') <> 'salary' then f.published_at end desc,
        f.published_at desc,
        f.id
      offset v_offset
      limit v_page_size
    )
    select jsonb_build_object(
      'data', coalesce((select jsonb_agg(to_jsonb(p) - 'result_order' order by p.result_order) from paged p), '[]'::jsonb),
      'page', v_page,
      'pageSize', v_page_size,
      'total', (select total from counted),
      'hasNext', v_offset + (select count(*) from paged) < (select total from counted),
      'asOf', v_now
    )
  );
end;
$$;

create or replace function public.get_public_job_by_slug(p_slug text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select to_jsonb(result)
  from (
    select
      j.id,
      j.company_id,
      j.title,
      j.slug,
      j.description_md,
      j.category_id,
      cat.name as category_name,
      cat.slug as category_slug,
      j.employment_type,
      j.location,
      j.is_remote,
      j.remote_region,
      j.salary_min,
      j.salary_max,
      j.currency,
      j.salary_period,
      j.apply_mode,
      j.apply_url,
      j.apply_email,
      j.is_featured,
      j.published_at,
      j.expires_at,
      j.created_at,
      j.updated_at,
      j.status,
      (j.status = 'expired'::public.job_status or j.expires_at <= now()) as is_expired,
      c.name as company_name,
      c.slug as company_slug,
      c.logo_url as company_logo_url,
      c.website as company_website,
      c.description as company_description,
      c.location as company_location,
      coalesce(array_agg(distinct t.slug) filter (where t.slug is not null), '{}'::text[]) as tag_slugs,
      now() as as_of
    from public.jobs j
    join public.companies c on c.id = j.company_id
    join public.categories cat on cat.id = j.category_id
    left join public.job_tags jt on jt.job_id = j.id
    left join public.tags t on t.id = jt.tag_id
    where j.slug = p_slug
      and j.published_at is not null
      and j.published_at <= now()
      and j.expires_at is not null
      and j.status in ('published'::public.job_status, 'expired'::public.job_status)
    group by j.id, cat.name, cat.slug, c.name, c.slug, c.logo_url, c.website, c.description, c.location
    limit 1
  ) as result;
$$;

create or replace function public.get_public_job_facets(p_filters jsonb default '{}'::jsonb)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  with live as (
    select j.id, j.category_id, j.employment_type, j.is_remote, j.location,
           j.salary_min, j.salary_max, j.currency, t.slug as tag_slug
    from public.jobs j
    left join public.job_tags jt on jt.job_id = j.id
    left join public.tags t on t.id = jt.tag_id
    where j.status = 'published'::public.job_status
      and j.published_at <= now()
      and j.expires_at > now()
  ),
  category_counts as (
    select c.slug as value, c.name as label, count(distinct l.id)::integer as count
    from public.categories c
    left join live l on l.category_id = c.id
    group by c.slug, c.name, c.sort
    order by c.sort
  ),
  type_counts as (
    select e.value::text as value,
           initcap(replace(e.value::text, '_', ' ')) as label,
           count(distinct l.id)::integer as count
    from unnest(enum_range(null::public.employment_type)) e(value)
    left join live l on l.employment_type = e.value
    group by e.value
    order by e.value
  ),
  location_counts as (
    select l.location as value, l.location as label, count(distinct l.id)::integer as count
    from live l
    where l.location is not null and trim(l.location) <> ''
    group by l.location
    order by count(distinct l.id) desc, l.location
  ),
  tag_counts as (
    select t.slug as value, t.name as label, count(distinct l.id)::integer as count
    from public.tags t
    left join live l on l.tag_slug = t.slug
    group by t.slug, t.name
    order by count(distinct l.id) desc, t.name
  )
  select jsonb_build_object(
    'categories', coalesce((select jsonb_agg(to_jsonb(category_counts)) from category_counts), '[]'::jsonb),
    'employmentTypes', coalesce((select jsonb_agg(to_jsonb(type_counts)) from type_counts), '[]'::jsonb),
    'workModes', jsonb_build_array(
      jsonb_build_object('value', 'remote', 'label', 'Remote', 'count', (select count(distinct id)::integer from live where is_remote)),
      jsonb_build_object('value', 'onsite', 'label', 'On-site', 'count', (select count(distinct id)::integer from live where not is_remote))
    ),
    'locations', coalesce((select jsonb_agg(to_jsonb(location_counts)) from location_counts), '[]'::jsonb),
    'tags', coalesce((select jsonb_agg(to_jsonb(tag_counts)) from tag_counts), '[]'::jsonb),
    'salaryBands', jsonb_build_array(
      jsonb_build_object('value', 'under-75k', 'label', 'Under 75k', 'count', (select count(distinct id)::integer from live where coalesce(salary_min, 0) < 75000)),
      jsonb_build_object('value', '75k-100k', 'label', '75k–100k', 'count', (select count(distinct id)::integer from live where coalesce(salary_min, 0) >= 75000 and coalesce(salary_min, 0) < 100000)),
      jsonb_build_object('value', '100k-150k', 'label', '100k–150k', 'count', (select count(distinct id)::integer from live where coalesce(salary_min, 0) >= 100000 and coalesce(salary_min, 0) < 150000)),
      jsonb_build_object('value', '150k-plus', 'label', '150k+', 'count', (select count(distinct id)::integer from live where coalesce(salary_min, 0) >= 150000))
    )
  );
$$;

create or replace function public.get_public_company_by_slug(p_slug text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select to_jsonb(result)
  from (
    select c.id, c.name, c.slug, c.logo_url, c.website, c.description, c.location,
      count(j.id)::integer as live_job_count
    from public.companies c
    join public.jobs j on j.company_id = c.id
      and j.status = 'published'::public.job_status
      and j.published_at <= now()
      and j.expires_at > now()
    where c.slug = p_slug
    group by c.id, c.name, c.slug, c.logo_url, c.website, c.description, c.location
    limit 1
  ) as result;
$$;

create or replace function public.list_public_companies()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(result) order by result.name), '[]'::jsonb)
  from (
    select c.id, c.name, c.slug, c.logo_url, c.website, c.description, c.location,
      count(j.id)::integer as live_job_count
    from public.companies c
    join public.jobs j on j.company_id = c.id
      and j.status = 'published'::public.job_status
      and j.published_at <= now()
      and j.expires_at > now()
    group by c.id, c.name, c.slug, c.logo_url, c.website, c.description, c.location
  ) as result;
$$;

create or replace function public.get_public_board_stats()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'jobCount', (select count(*)::integer from public.jobs where status = 'published'::public.job_status and published_at <= now() and expires_at > now()),
    'companyCount', (select count(distinct company_id)::integer from public.jobs where status = 'published'::public.job_status and published_at <= now() and expires_at > now()),
    'latestPublishedAt', (select max(published_at) from public.jobs where status = 'published'::public.job_status and published_at <= now() and expires_at > now()),
    'asOf', now()
  );
$$;

revoke execute on function public.search_public_jobs(jsonb, integer, integer) from public;
revoke execute on function public.get_public_job_by_slug(text) from public;
revoke execute on function public.get_public_job_facets(jsonb) from public;
revoke execute on function public.get_public_company_by_slug(text) from public;
revoke execute on function public.list_public_companies() from public;
revoke execute on function public.get_public_board_stats() from public;

grant execute on function public.search_public_jobs(jsonb, integer, integer) to anon, authenticated;
grant execute on function public.get_public_job_by_slug(text) to anon, authenticated;
grant execute on function public.get_public_job_facets(jsonb) to anon, authenticated;
grant execute on function public.get_public_company_by_slug(text) to anon, authenticated;
grant execute on function public.list_public_companies() to anon, authenticated;
grant execute on function public.get_public_board_stats() to anon, authenticated;
