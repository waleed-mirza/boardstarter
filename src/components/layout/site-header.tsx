import Link from "next/link";
import Image from "next/image";
import { PlusIcon } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { getCachedPublicSiteConfig } from "@/lib/data/settings";

export async function SiteHeader() {
  const config = await getCachedPublicSiteConfig();
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border bg-bg">
      <div className="container-page flex h-full items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight focus-ring">
            {config.logoUrl ? <Image src={config.logoUrl} alt="" width={28} height={28} className="size-7 rounded-sm object-contain" /> : null}
            {config.siteName}
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
            <Link href="/jobs" className="rounded-sm px-2 py-2 text-sm text-fg-muted transition-colors duration-120 hover:text-fg focus-ring">Jobs</Link>
            <Link href="/companies" className="rounded-sm px-2 py-2 text-sm text-fg-muted transition-colors duration-120 hover:text-fg focus-ring">Companies</Link>
            <Link href="/dashboard/post" className="rounded-sm px-2 py-2 text-sm text-fg-muted transition-colors duration-120 hover:text-fg focus-ring">Post a Job</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2"><ThemeToggle /><Button asChild><Link href="/dashboard/post"><PlusIcon aria-hidden /> Post a Job</Link></Button></div>
      </div>
    </header>
  );
}
