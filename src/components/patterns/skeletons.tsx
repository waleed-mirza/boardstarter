import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

/**
 * Skeletons match the real layout's geometry, not generic grey bars (§5.4):
 * a 72px job row — 40px logo, title line, meta line (§5.5).
 */
export function JobRowSkeleton() {
  return (
    <div className="flex h-18 items-center gap-4 px-4">
      <Skeleton className="size-10 shrink-0 rounded-md" />
      <div className="flex w-full flex-col gap-2">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  )
}

export function ListSkeleton({
  rows = 5,
  className,
}: {
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("divide-y divide-border rounded-lg border border-border", className)}>
      {Array.from({ length: rows }, (_, index) => (
        <JobRowSkeleton key={index} />
      ))}
    </div>
  )
}

export function HomeSkeleton() {
  return (
    <div className="container-page flex flex-col gap-8 py-16">
      <div className="flex flex-col gap-3"><Skeleton className="h-10 w-3/5" /><Skeleton className="h-5 w-2/5" /><Skeleton className="h-11 w-full max-w-content" /></div>
      <ListSkeleton rows={6} />
    </div>
  );
}

export function JobsPageSkeleton({ rows = 20 }: { rows?: number }) {
  return (
    <main className="container-page py-8 md:py-12">
      <header className="max-w-content">
        <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">Open roles</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Browse jobs</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Search a dense list of live roles and share any filtered view.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Skeleton className="min-h-11 flex-1" />
          <Skeleton className="min-h-11 sm:max-w-52 sm:flex-1" />
          <Skeleton className="min-h-11 sm:w-28" />
        </div>
      </header>
      <div className="mt-6 flex flex-col gap-6 lg:grid lg:grid-cols-[var(--container-filter)_minmax(0,1fr)] lg:gap-8">
        <aside
          className="sticky top-20 hidden self-start rounded-lg border border-border bg-bg p-4 lg:block"
          aria-hidden
        >
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-6 h-4 w-20" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </aside>
        <section className="min-w-0" aria-label="Job results">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="min-h-11 w-40" />
          </div>
          <div className="mt-4">
            <ListSkeleton rows={rows} />
          </div>
        </section>
      </div>
    </main>
  );
}

export function JobDetailSkeleton() {
  return (
    <main className="container-page py-8 pb-24 md:py-12">
      <div className="mb-8 inline-flex min-h-11 items-center text-sm text-fg-muted">Browse jobs</div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_var(--container-apply)] lg:gap-12">
        <article className="min-w-0">
          <header className="border-b border-border pb-8">
            <div className="flex items-start gap-4">
              <Skeleton className="size-12 shrink-0 rounded-md" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-8 w-3/5" />
                <Skeleton className="mt-3 h-4 w-2/5" />
              </div>
            </div>
          </header>
          <div className="mt-8 flex max-w-prose flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </article>
        <div className="hidden lg:block">
          <div className="rounded-lg border border-border bg-bg p-5">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-3/4" />
            <Skeleton className="mt-5 min-h-11 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
