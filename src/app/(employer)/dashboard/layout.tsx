import Link from "next/link";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/guards";

const NAV = [
  { href: "/dashboard", label: "Jobs" },
  { href: "/dashboard/post", label: "Post a Job" },
  { href: "/dashboard/billing", label: "Billing" },
  { href: "/dashboard/settings", label: "Settings" },
] as const;

export const instant = false;

/**
 * Employer area (§5.5): 220px sidebar + content. Guarded here so every
 * child route (including future deep links) inherits the check.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("employer", "/dashboard");
  // No company yet — every employer route (incl. /dashboard/post) requires one.
  if (!user.companyId) redirect("/onboarding");

  return (
    <div className="min-h-svh bg-bg-subtle">
      <a
        href="#dashboard-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      <div className="container-page flex gap-8 py-8">
        <aside className="hidden w-[220px] shrink-0 md:block" aria-label="Employer menu">
          <p className="px-2 text-sm font-medium">{user.fullName ?? user.email}</p>
          <nav className="mt-4 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm px-2 py-1.5 text-sm text-fg-muted transition-colors duration-120 hover:text-fg focus-ring"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main id="dashboard-main" className="min-w-0 flex-1">
          <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-2 md:hidden" aria-label="Employer menu">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="min-h-9 shrink-0 rounded-md px-3 py-1.5 text-sm text-fg-muted hover:bg-bg-muted hover:text-fg focus-ring">
                {item.label}
              </Link>
            ))}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
