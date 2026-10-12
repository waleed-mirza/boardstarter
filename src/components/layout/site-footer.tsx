import Link from "next/link";
import { cacheLife } from "next/cache";

import { getCachedPublicSiteConfig } from "@/lib/data/settings";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  { heading: "Board", links: [{ label: "Browse jobs", href: "/jobs" }, { label: "Companies", href: "/companies" }, { label: "Categories", href: "/jobs" }] },
  { heading: "Employers", links: [{ label: "Post a job", href: "/dashboard/post" }, { label: "Dashboard", href: "/dashboard" }] },
  { heading: "Resources", links: [{ label: "Job alerts", href: "/alerts" }] },
  { heading: "Legal", links: [{ label: "Terms", href: "/terms" }, { label: "Privacy", href: "/privacy" }] },
];

export async function SiteFooter() {
  const [config, year] = await Promise.all([getCachedPublicSiteConfig(), getCopyrightYear()]);
  return (
    <footer className="mt-auto border-t border-border">
      <div className="container-page grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
        {COLUMNS.map((column) => <div key={column.heading} className="flex flex-col gap-3"><h2 className="text-2xs font-medium tracking-wider text-fg-subtle uppercase">{column.heading}</h2><ul className="flex flex-col gap-2">{column.links.map((link) => <li key={link.label}><Link href={link.href} className="text-xs text-fg-muted transition-colors duration-120 hover:text-fg focus-ring">{link.label}</Link></li>)}</ul></div>)}
      </div>
      <div className="border-t border-border"><div className="container-page flex items-center justify-between py-4 text-xs text-fg-muted"><span>© {year} {config.siteName}</span></div></div>
    </footer>
  );
}

async function getCopyrightYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}
