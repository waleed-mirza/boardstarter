import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="container-page flex min-h-96 items-center justify-center py-16 text-center">
      <div>
        <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">403</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Admin access required</h1>
        <p className="mx-auto mt-3 max-w-prose text-sm text-fg-muted">This area is only available to board administrators.</p>
        <Link href="/dashboard" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg focus-ring">Return to dashboard</Link>
      </div>
    </main>
  );
}
