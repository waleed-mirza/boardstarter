"use client";

import { useEffect } from "react";
import type { ComponentProps } from "react";

function sendTrack(jobId: string, kind: "view" | "click") {
  void fetch("/api/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jobId, kind }),
    keepalive: true,
    credentials: "same-origin",
  }).catch(() => undefined);
}

export function JobViewTracker({ jobId, enabled = true }: { jobId: string; enabled?: boolean }) {
  useEffect(() => {
    if (enabled) sendTrack(jobId, "view");
  }, [enabled, jobId]);
  return null;
}

export function TrackedApplyLink({
  jobId,
  href,
  children,
  className,
  ...props
}: ComponentProps<"a"> & { jobId: string }) {
  return (
    <a
      href={href}
      className={className}
      onClick={() => sendTrack(jobId, "click")}
      {...props}
    >
      {children}
    </a>
  );
}
