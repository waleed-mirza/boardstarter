"use client";

import { ErrorState } from "@/components/patterns/error-state";
import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="We couldn’t load your jobs" description="Please try again. Your saved drafts are safe." retry={<Button type="button" onClick={reset}>Try again</Button>} />;
}
