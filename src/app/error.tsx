"use client";

import { RotateCcwIcon } from "lucide-react";

import { ErrorState } from "@/components/patterns/error-state";
import { Button } from "@/components/ui/button";

export default function RootErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // error.message never renders raw to users — the pattern shows a fixed line.
  console.error(error);
  return (
    <main className="flex flex-1 items-center justify-center">
      <ErrorState
        description="Something broke on our side. Try again — if it keeps happening, the digest below helps us find it."
        retry={
          <Button onClick={reset} size="sm">
            <RotateCcwIcon /> Try again
          </Button>
        }
      />
    </main>
  );
}
