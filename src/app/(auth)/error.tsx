"use client";

import { ErrorState } from "@/components/patterns/error-state";
import { Button } from "@/components/ui/button";

export default function AuthError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState title="Sign-in is temporarily unavailable" description="Try again in a moment. Your account data is safe." retry={<Button onClick={reset}>Try again</Button>} />;
}
