import type { Metadata } from "next";

import { AlertSignupForm } from "@/components/alerts/alert-signup-form";
import { listPublicCategories } from "@/lib/data/taxonomy";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const instant = false;

export const metadata: Metadata = buildPageMetadata({
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  title: "Job alerts",
  description: "Get a thoughtful daily or weekly note when new roles match your preferences.",
  path: "/alerts",
});

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string | string[]; status?: string | string[] }>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const email = Array.isArray(params.email) ? params.email[0] : params.email;
  const status = Array.isArray(params.status) ? params.status[0] : params.status;
  const categories = await listPublicCategories();
  let message: string | null = null;
  if (status === "confirmed") message = "Your alerts are confirmed.";
  if (status === "unsubscribed") message = "You have been unsubscribed.";
  if (status === "invalid") message = "That alert link is invalid or expired.";
  if (status === "already-used") message = "That alert link has already been used.";

  return (
    <main className="container-page py-12 md:py-16">
      <div className="mx-auto grid w-full max-w-content gap-8">
        <header>
          <p className="text-xs font-medium tracking-wider text-fg-subtle uppercase">Job alerts</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Stay close to new work.</h1>
          <p className="mt-3 max-w-prose text-lg text-fg-muted">
            Choose a rhythm and the areas you care about. We will ask you to confirm your address
            before sending anything else.
          </p>
        </header>
        {message ? (
          <p role="status" className="rounded-lg border border-border bg-bg-subtle p-4 text-sm">
            {message}
          </p>
        ) : null}
        <section
          className="rounded-lg border border-border bg-bg-subtle p-6 md:p-8"
          aria-label="Alert preferences"
        >
          <AlertSignupForm
            initialEmail={email}
            categories={categories.map((category) => ({ id: category.id, name: category.name }))}
          />
        </section>
      </div>
    </main>
  );
}
