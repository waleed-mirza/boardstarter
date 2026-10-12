import Link from "next/link";

export default function PublicNotFound() {
  return <main className="container-page flex min-h-96 items-center justify-center py-16 text-center"><div><p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">404</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">That listing is not here</h1><p className="mt-3 text-sm text-fg-muted">It may have expired or moved. Try the live board or set an alert for the next opening.</p><div className="mt-6 flex justify-center gap-3"><Link href="/jobs" className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg focus-ring">Browse jobs</Link><Link href="/alerts" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium focus-ring">Get alerts</Link></div></div></main>;
}
