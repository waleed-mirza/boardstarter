import type { JobFilters } from "@/lib/jobs/filters";

export function JobListToolbar({
  filters,
  total,
}: {
  filters: JobFilters;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-fg-muted" data-testid="job-total">
        <span className="font-medium text-fg tabular-nums">{total}</span> {total === 1 ? "job" : "jobs"}
      </p>
      <form action="/jobs" method="get" className="flex items-center gap-2">
        {filters.query !== undefined ? <input type="hidden" name="q" value={filters.query} /> : null}
        {(filters.categories ?? []).map((value) => <input key={`category-${value}`} type="hidden" name="category" value={value} />)}
        {(filters.employmentTypes ?? []).map((value) => <input key={`type-${value}`} type="hidden" name="type" value={value} />)}
        {filters.remote !== undefined ? <input type="hidden" name="remote" value={filters.remote ? "1" : "0"} /> : null}
        {filters.location ? <input type="hidden" name="location" value={filters.location} /> : null}
        {filters.salaryBand ? <input type="hidden" name="salary" value={filters.salaryBand} /> : null}
        {(filters.tags ?? []).map((value) => <input key={`tag-${value}`} type="hidden" name="tag" value={value} />)}
        <label htmlFor="job-sort" className="text-sm text-fg-muted">Sort</label>
        <select id="job-sort" name="sort" defaultValue={filters.sort ?? "newest"} className="min-h-11 rounded-lg border border-border bg-bg px-3 text-sm focus-ring">
          <option value="newest">Newest</option>
          <option value="salary">Salary</option>
        </select>
        <button type="submit" className="sr-only">Apply sort</button>
      </form>
    </div>
  );
}
