"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { FilterIcon } from "lucide-react";

import { FilterPanel } from "@/components/jobs/filter-panel";
import type { JobFacetCounts, JobFilters } from "@/lib/jobs/filters";

export function MobileJobFilters({
  filters,
  facets,
  count,
}: {
  filters: JobFilters;
  facets: JobFacetCounts;
  count: number;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="min-h-11 gap-2 md:hidden" aria-label={`Filters${count ? `, ${count} active` : ""}`}>
          <FilterIcon aria-hidden />
          Filters
          {count > 0 ? <span className="tabular-nums text-xs text-fg-muted">{count}</span> : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full max-w-sm overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>Refine the jobs shown on this page.</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <FilterPanel filters={filters} facets={facets} mobile />
        </div>
      </SheetContent>
    </Sheet>
  );
}
