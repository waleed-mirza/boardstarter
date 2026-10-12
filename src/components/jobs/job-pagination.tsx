import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { buildJobSearchParams, getPaginationState, type JobFilters } from "@/lib/jobs/filters";

function href(filters: JobFilters, page: number): string {
  const query = buildJobSearchParams(filters, page).toString();
  return query ? `/jobs?${query}` : "/jobs";
}

export function JobPagination({
  filters,
  page,
  total,
  pageSize,
}: {
  filters: JobFilters;
  page: number;
  total: number;
  pageSize: number;
}) {
  const state = getPaginationState(page, total, pageSize);
  if (state.pageCount <= 1) return null;
  const pages = Array.from({ length: state.pageCount }, (_, index) => index + 1).filter(
    (value) => value === 1 || value === state.pageCount || Math.abs(value - state.page) <= 1,
  );
  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious href={href(filters, Math.max(1, state.page - 1))} aria-disabled={!state.hasPrevious} />
        </PaginationItem>
        {pages.map((value) => (
          <PaginationItem key={value}>
            <PaginationLink href={href(filters, value)} isActive={value === state.page}>
              {value}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext href={href(filters, state.page + 1)} aria-disabled={!state.hasNext} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
