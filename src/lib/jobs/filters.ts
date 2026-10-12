import type { EmploymentType } from "@/lib/data/types";
import type { Json } from "@/lib/supabase/types";

export const JOB_PAGE_SIZE = 20;

export const SALARY_BANDS = [
  { value: "under-75k", label: "Under 75k" },
  { value: "75k-100k", label: "75k–100k" },
  { value: "100k-150k", label: "100k–150k" },
  { value: "150k-plus", label: "150k+" },
] as const;

export type SalaryBand = (typeof SALARY_BANDS)[number]["value"];
export type JobSort = "newest" | "salary";

export type JobFilters = {
  query?: string;
  categories?: string[];
  employmentTypes?: EmploymentType[];
  remote?: boolean;
  /** Backwards-compatible alias used by the Week 2 data tests. */
  isRemote?: boolean;
  location?: string;
  salaryBand?: SalaryBand;
  tags?: string[];
  sort?: JobSort;
  companySlug?: string;
  categorySlug?: string;
  tagSlug?: string;
  featuredOnly?: boolean;
};

export type PublicJobSearchParams = {
  q?: string | string[];
  category?: string | string[];
  type?: string | string[];
  remote?: string | string[];
  location?: string | string[];
  salary?: string | string[];
  tag?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

export type FacetOption = {
  value: string;
  label: string;
  count: number;
};

export type JobFacetCounts = {
  categories: FacetOption[];
  employmentTypes: FacetOption[];
  workModes: FacetOption[];
  locations: FacetOption[];
  tags: FacetOption[];
  salaryBands: FacetOption[];
};

const EMPLOYMENT_TYPES: EmploymentType[] = [
  "full_time",
  "part_time",
  "contract",
  "temporary",
  "internship",
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function many(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}

function isSalaryBand(value: string | undefined): value is SalaryBand {
  return SALARY_BANDS.some((band) => band.value === value);
}

function isEmploymentType(value: string): value is EmploymentType {
  return EMPLOYMENT_TYPES.includes(value as EmploymentType);
}

function parsePage(value: string | undefined): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const page = Number(value);
  return Number.isSafeInteger(page) ? Math.max(page, 1) : undefined;
}

export function sanitizeSearchQuery(input: string): string {
  return input
    .normalize("NFKC")
    .slice(0, 500)
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseJobSearchParams(params: PublicJobSearchParams): {
  filters: JobFilters;
  page: number;
} {
  const queryValue = first(params.q);
  const categoryValues = many(params.category);
  const typeValues = many(params.type).filter(isEmploymentType);
  const tagValues = many(params.tag);
  const remoteValue = first(params.remote);
  const remote = remoteValue === "1" || remoteValue === "0" ? remoteValue === "1" : undefined;
  const location = first(params.location)?.trim() || undefined;
  const salaryValue = first(params.salary);
  const sortValue = first(params.sort);
  const query = queryValue === undefined ? undefined : sanitizeSearchQuery(queryValue) || undefined;
  const filters: JobFilters = {
    query,
    categories: categoryValues.length > 0 ? categoryValues : undefined,
    employmentTypes: typeValues.length > 0 ? typeValues : undefined,
    remote,
    location,
    salaryBand: isSalaryBand(salaryValue) ? salaryValue : undefined,
    tags: tagValues.length > 0 ? tagValues : undefined,
    sort: sortValue === "salary" ? "salary" : "newest",
  };

  return {
    filters,
    page: parsePage(first(params.page)) ?? 1,
  };
}

export function buildJobSearchParams(filters: JobFilters, page = 1): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query !== undefined) params.set("q", filters.query);
  for (const value of filters.categories ?? []) params.append("category", value);
  for (const value of filters.employmentTypes ?? []) params.append("type", value);
  if (filters.remote !== undefined) params.set("remote", filters.remote ? "1" : "0");
  if (filters.location) params.set("location", filters.location);
  if (filters.salaryBand) params.set("salary", filters.salaryBand);
  for (const value of filters.tags ?? []) params.append("tag", value);
  if (filters.sort === "salary") params.set("sort", "salary");
  if (page > 1) params.set("page", String(Math.floor(page)));
  return params;
}

export function activeFilterCount(filters: JobFilters): number {
  return (
    (filters.query ? 1 : 0) +
    (filters.categories?.length ?? 0) +
    (filters.employmentTypes?.length ?? 0) +
    (filters.remote === undefined && filters.isRemote === undefined ? 0 : 1) +
    (filters.location ? 1 : 0) +
    (filters.salaryBand ? 1 : 0) +
    (filters.tags?.length ?? 0)
  );
}

export function getPaginationState(page: number, total: number, pageSize = JOB_PAGE_SIZE) {
  const safePage = Math.max(1, Math.floor(page));
  const safeTotal = Math.max(0, Math.floor(total));
  const safePageSize = Math.max(1, Math.floor(pageSize));
  const pageCount = Math.max(1, Math.ceil(safeTotal / safePageSize));
  return {
    page: safePage,
    pageSize: safePageSize,
    pageCount,
    hasPrevious: safePage > 1,
    hasNext: safePage < pageCount,
    start: safeTotal === 0 ? 0 : (safePage - 1) * safePageSize + 1,
    end: Math.min(safePage * safePageSize, safeTotal),
  };
}

export function toRpcFilters(filters: JobFilters): Record<string, Json> {
  const result: Record<string, Json> = {};
  const query = filters.query === undefined ? "" : sanitizeSearchQuery(filters.query);
  if (query) result.query = query;
  if (filters.categories?.length) result.categories = filters.categories;
  if (filters.employmentTypes?.length) result.employmentTypes = filters.employmentTypes;
  if (filters.remote !== undefined) result.remote = filters.remote;
  else if (filters.isRemote !== undefined) result.remote = filters.isRemote;
  if (filters.location) result.location = filters.location;
  if (filters.salaryBand) result.salaryBand = filters.salaryBand;
  if (filters.tags?.length) result.tags = filters.tags;
  if (filters.sort) result.sort = filters.sort;
  if (filters.companySlug) result.companySlug = filters.companySlug;
  if (filters.categorySlug) result.categorySlug = filters.categorySlug;
  if (filters.tagSlug) result.tag = filters.tagSlug;
  if (filters.featuredOnly !== undefined) result.featuredOnly = filters.featuredOnly;
  return result;
}
