import Link from "next/link";
import type { ReactNode } from "react";

import { requireAdmin } from "@/lib/auth/guards";

const NAV = [
  { href: "/admin", label: "Queue" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/packages", label: "Packages" },
  { href: "/admin/taxonomy", label: "Taxonomy" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export const instant = false;

/**
 * Admin area (§5.5): employer-style shell with the accent-tinted top strip
 * that makes admin visually distinct. Guarded here for all admin routes.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin("/admin");

  return (
    <div className="min-h-svh bg-bg-subtle">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
      >
        Skip to content
      </a>
      {/* Accent-tinted strip — the admin tell (§5.5). */}
      <div className="h-1.5 bg-accent" aria-hidden="true" />
      <div className="container-page flex gap-8 py-8">
        <aside className="hidden w-[220px] shrink-0 md:block" aria-label="Admin menu">
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
        <main id="admin-main" className="min-w-0 flex-1">
          <nav className="mb-6 flex gap-2 overflow-x-auto border-b border-border pb-2 md:hidden" aria-label="Admin menu">
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
