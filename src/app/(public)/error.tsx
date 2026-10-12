"use client";

import { ErrorState } from "@/components/patterns/error-state";
import { Button } from "@/components/ui/button";

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="container-page py-16"><ErrorState title="The public board could not load" description="Try again, or return to the homepage." retry={<Button onClick={() => reset()}>Try again</Button>} /></main>;
}
