import { cn } from "@/lib/utils"

export type JobStatusPill = "draft" | "pending" | "live" | "expired" | "rejected"

const STATUS_CONFIG: Record<JobStatusPill, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-bg-muted text-fg-muted" },
  pending: { label: "Pending review", className: "bg-warning/10 text-warning" },
  live: { label: "Live", className: "bg-success/10 text-success" },
  expired: { label: "Expired", className: "bg-bg-muted text-fg-muted" },
  rejected: { label: "Rejected", className: "bg-danger/10 text-danger" },
}

/** Fixed color and label per status — color is semantic only (§5.3). */
export function StatusPill({
  status,
  className,
}: {
  status: JobStatusPill
  className?: string
}) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {config.label}
    </span>
  )
}
