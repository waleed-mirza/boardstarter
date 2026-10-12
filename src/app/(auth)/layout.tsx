import Link from "next/link";
import type { ReactNode } from "react";

import { getCachedPublicSiteConfig } from "@/lib/data/settings";

/**
 * Auth surface (§5.5): no public chrome — a centered 400px card on
 * --color-bg-subtle with just a wordmark above it.
 */
export const instant = false;

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const config = await getCachedPublicSiteConfig();
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-bg-subtle p-4">
      <Link href="/" className="text-base font-semibold tracking-tight focus-ring">
        {config.siteName}
      </Link>
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  );
}
