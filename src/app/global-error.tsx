"use client";

import { useEffect } from "react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // The root layout may be unavailable, so this boundary deliberately has no app imports.
    console.error("global_error", "root layout failed");
  }, []);
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-svh items-center justify-center bg-bg p-6 text-center text-fg">
          <div>
            <h1 className="text-xl font-semibold">We hit a temporary problem</h1>
            <p className="mt-3 text-sm text-fg-muted">Please try again. If the problem continues, check the deployment logs.</p>
            <button className="mt-6 inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-accent-fg focus-ring" type="button" onClick={reset}>Try again</button>
          </div>
        </main>
      </body>
    </html>
  );
}
