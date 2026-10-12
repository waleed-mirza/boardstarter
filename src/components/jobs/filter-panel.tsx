import Link from "next/link";

import type { JobFacetCounts, JobFilters } from "@/lib/jobs/filters";
import { SALARY_BANDS } from "@/lib/jobs/filters";
import { formatEmploymentType } from "@/lib/jobs/format";

function checked(values: string[] | undefined, value: string): boolean {
  return values?.includes(value) ?? false;
}

function FilterGroup({
  title,
  children,
  open = true,
}: {
  title: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="border-b border-border py-4 last:border-b-0">
      <summary className="cursor-pointer list-none text-sm font-medium focus-ring">{title}</summary>
      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </details>
  );
}

function Option({
  name,
  value,
  label,
  count,
  type = "checkbox",
  isChecked = false,
}: {
  name: string;
  value: string;
  label: string;
  count: number;
  type?: "checkbox" | "radio";
  isChecked?: boolean;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-fg-muted hover:text-fg">
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={isChecked}
        className="size-4 accent-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="tabular-nums text-xs text-fg-subtle">{count}</span>
    </label>
  );
}

export function FilterPanel({
  filters,
  facets,
  mobile = false,
}: {
  filters: JobFilters;
  facets: JobFacetCounts;
  mobile?: boolean;
}) {
  return (
    <form action="/jobs" method="get" className="flex flex-col" data-testid={mobile ? "mobile-filter-form" : "filter-form"}>
      {filters.query !== undefined ? <input type="hidden" name="q" value={filters.query} /> : null}
      {filters.location && !facets.locations.some((option) => option.value === filters.location) ? (
        <input type="hidden" name="location" value={filters.location} />
      ) : null}
      {filters.sort === "salary" ? <input type="hidden" name="sort" value="salary" /> : null}
      <FilterGroup title="Category">
        {facets.categories.map((option) => (
          <Option
            key={option.value}
            name="category"
            value={option.value}
            label={option.label}
            count={option.count}
            isChecked={checked(filters.categories, option.value)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Employment type">
        {facets.employmentTypes.map((option) => (
          <Option
            key={option.value}
            name="type"
            value={option.value}
            label={formatEmploymentType(option.value as Parameters<typeof formatEmploymentType>[0])}
            count={option.count}
            isChecked={checked(filters.employmentTypes, option.value)}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Work mode">
        {facets.workModes.map((option) => (
          <Option
            key={option.value}
            name="remote"
            value={option.value === "remote" ? "1" : "0"}
            label={option.label}
            count={option.count}
            type="radio"
            isChecked={filters.remote === (option.value === "remote")}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Location" open={mobile ? false : true}>
        {facets.locations.map((option) => (
          <Option
            key={option.value}
            name="location"
            value={option.value}
            label={option.label}
            count={option.count}
            type="radio"
            isChecked={filters.location === option.value}
          />
        ))}
      </FilterGroup>
      <FilterGroup title="Salary band">
        {SALARY_BANDS.map((band) => {
          const option = facets.salaryBands.find((item) => item.value === band.value);
          return (
            <Option
              key={band.value}
              name="salary"
              value={band.value}
              label={band.label}
              count={option?.count ?? 0}
              type="radio"
              isChecked={filters.salaryBand === band.value}
            />
          );
        })}
      </FilterGroup>
      <FilterGroup title="Tags" open={mobile ? false : true}>
        {facets.tags
          .filter((option) => option.count > 0)
          .map((option) => (
            <Option
              key={option.value}
              name="tag"
              value={option.value}
              label={option.label}
              count={option.count}
              isChecked={checked(filters.tags, option.value)}
            />
          ))}
      </FilterGroup>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="submit"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg transition-colors duration-120 hover:bg-accent/90 focus-ring"
        >
          Apply filters
        </button>
        <Link href="/jobs" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-fg-muted hover:text-fg focus-ring">
          Clear
        </Link>
      </div>
    </form>
  );
}
