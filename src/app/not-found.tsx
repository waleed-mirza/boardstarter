import Link from "next/link";
import { SearchXIcon } from "lucide-react";

import { EmptyState } from "@/components/patterns/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <EmptyState
        icon={SearchXIcon}
        title="Page not found"
        description="The page you're after doesn't exist — it may have expired or moved."
        action={
          <Button asChild size="sm">
            <Link href="/">Back to the board</Link>
          </Button>
        }
      />
      <nav aria-label="Helpful links" className="mt-4 flex gap-4 text-sm text-fg-muted">
        <Link href="/jobs" className="hover:text-fg">Browse jobs</Link>
        <Link href="/alerts" className="hover:text-fg">Job alerts</Link>
      </nav>
    </main>
  );
}
