"use client"

import { TriangleAlertIcon } from "lucide-react"
import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** For error.tsx boundaries, with a retry action (§5.4). */
export function ErrorState({
  title = "Something went wrong",
  description,
  retry,
  className,
}: {
  title?: string
  description?: string
  retry?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-16 text-center",
        className
      )}
    >
      <TriangleAlertIcon className="size-5 text-danger" aria-hidden />
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="max-w-sm text-sm text-fg-muted">{description}</p> : null}
      {retry ? <div className="mt-4">{retry}</div> : null}
    </div>
  )
}
