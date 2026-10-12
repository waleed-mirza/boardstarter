import type { Metadata } from "next";
import { BriefcaseIcon, RotateCcwIcon, SearchXIcon } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { EmptyState } from "@/components/patterns/empty-state";
import { ErrorState } from "@/components/patterns/error-state";
import { PageHeader } from "@/components/patterns/page-header";
import { ListSkeleton } from "@/components/patterns/skeletons";
import { StatusPill } from "@/components/patterns/status-pill";
import { Button } from "@/components/ui/button";

import { FormDemo } from "./_demos/form-demo";
import { PrimitivesDemo } from "./_demos/primitives-demo";
import { TableDemo } from "./_demos/table-demo";
import { JobRowDemo } from "./_demos/job-row-demo";

export const metadata: Metadata = {
  title: "Kitchen sink",
  robots: { index: false, follow: false },
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-fg-muted">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Permanent design contract: every component in every variant, light and dark
 * (§5.4). This route is the visual-regression target — layout changes here are
 * deliberate design changes.
 */
export default function KitchenSinkPage() {
  return (
    <main className="container-page flex flex-col gap-16 py-12">
      <PageHeader
        title="Kitchen sink"
        description="Every component in every variant. The visual-regression target for both themes."
        actions={<ThemeToggle />}
      />

      <Section title="Patterns" description="Composites every page builds from.">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-6">
          <StatusPill status="draft" />
          <StatusPill status="pending" />
          <StatusPill status="live" />
          <StatusPill status="expired" />
          <StatusPill status="rejected" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border">
            <EmptyState
              icon={SearchXIcon}
              title="No jobs match your filters"
              description="Try clearing a filter or two — the list updates instantly."
              action={
                <Button variant="outline" size="sm">
                  Clear filters
                </Button>
              }
            />
          </div>
          <div className="rounded-lg border border-border">
            <ErrorState
              description="The job list failed to load. This is what every error boundary looks like."
              retry={
                <Button size="sm">
                  <RotateCcwIcon /> Try again
                </Button>
              }
            />
          </div>
          <div className="rounded-lg border border-border">
            <EmptyState
              icon={BriefcaseIcon}
              title="No jobs yet"
              description="The board's first posting will appear here."
              action={
                <Button size="sm">
                  Post a job
                </Button>
              }
            />
          </div>
          <div className="space-y-4">
            <p className="text-sm text-fg-muted">Loading — row geometry matches the real list (§5.5):</p>
            <ListSkeleton rows={2} />
          </div>
        </div>
      </Section>

      <Section title="DataTable" description="Sortable headers, sticky header, status pills, tabular numbers.">
        <TableDemo />
      </Section>

      <Section title="Job rows" description="The dense public-board row in every visual state.">
        <JobRowDemo />
      </Section>

      <Section title="Form fields" description="Label, control, description, inline error — always this order. Submit empty to see errors.">
        <FormDemo />
      </Section>

      <Section title="Primitives" description="Every shadcn primitive copied in and restyled to the tokens.">
        <PrimitivesDemo />
      </Section>
    </main>
  );
}
