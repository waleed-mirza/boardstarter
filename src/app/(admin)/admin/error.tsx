"use client";

import { ErrorState } from "@/components/patterns/error-state";
import { Button } from "@/components/ui/button";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <ErrorState title="Admin page unavailable" description="The page could not load. Try again, or check the Supabase connection." retry={<Button onClick={reset}>Try again</Button>} />; }
