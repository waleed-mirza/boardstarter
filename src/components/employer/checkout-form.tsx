"use client";

import { useState, useTransition } from "react";

import { createCheckout } from "@/lib/actions/payments";
import type { PackageRow } from "@/lib/data/types";

import { Button } from "@/components/ui/button";

import { PackageSelector } from "./package-selector";

export function CheckoutForm({
  jobId,
  packages,
  submitLabel = "Continue to checkout",
}: {
  jobId: string;
  packages: readonly PackageRow[];
  submitLabel?: string;
}) {
  const [selectedPackageId, setSelectedPackageId] = useState(packages[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [submitStarted, setSubmitStarted] = useState(false);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitStarted) return;
    setSubmitStarted(true);
    setError(null);
    startTransition(async () => {
      const result = await createCheckout(jobId, selectedPackageId);
      if (!result.ok) {
        setSubmitStarted(false);
        setError(result.error);
        return;
      }
      window.location.assign(result.data.url);
    });
  }

  if (packages.length === 0) {
    return <p className="text-sm text-fg-muted">No active packages are available right now.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <PackageSelector
        packages={packages}
        value={selectedPackageId}
        onValueChange={setSelectedPackageId}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending || !selectedPackageId}>
        {pending ? "Starting checkout…" : submitLabel}
      </Button>
    </form>
  );
}
