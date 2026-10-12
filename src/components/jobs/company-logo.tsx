"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}` : words[0]?.slice(0, 2) ?? "?").toUpperCase();
}

export function CompanyLogo({
  name,
  src,
  size = 40,
  className,
}: {
  name: string;
  src?: string | null;
  size?: 32 | 40 | 48;
  className?: string;
}) {
  const [failed, setFailed] = useState(!src);
  const showImage = Boolean(src && !failed);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-bg-muted text-xs font-semibold text-fg-muted",
        size === 32 && "size-8",
        size === 40 && "size-10",
        size === 48 && "size-12",
        className,
      )}
      {...(showImage ? {} : { role: "img" as const, "aria-label": `${name} logo` })}
    >
      <span aria-hidden className="absolute inset-0 flex items-center justify-center">
        {initials(name)}
      </span>
      {src && showImage ? (
        <Image
          src={src}
          alt={`${name} logo`}
          width={size}
          height={size}
          className="relative size-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}
