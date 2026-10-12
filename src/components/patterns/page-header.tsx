import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Title, description, actions slot — used on every dashboard and admin page
 * so they never drift apart (§5.4).
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-4 pb-6", className)}>
      <div className="max-w-content">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="mt-2 text-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  )
}
