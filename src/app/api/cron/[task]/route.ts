import { revalidateTag } from "next/cache";

import { runCronTask, isCronTask } from "@/lib/automation/tasks";
import { isAuthorizedCronRequest } from "@/lib/cron/auth";
import { getEmailProvider } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { submitGoogleIndexingBestEffort } from "@/lib/seo/indexing";

export async function GET(
  _request: Request,
  context: { params: Promise<{ task: string }> },
): Promise<Response> {
  if (!isAuthorizedCronRequest(_request))
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { task: taskName } = await context.params;
  if (!isCronTask(taskName))
    return Response.json({ ok: false, error: "Unknown cron task" }, { status: 404 });

  try {
    // Cron runs are unauthenticated; RLS cannot perform queue claims and
    // cross-subscriber automation, so this route is the approved service role boundary.
    const client = createAdminClient();
    const provider =
      taskName === "send-digest" || taskName === "renewal-nudges" ? getEmailProvider() : null;
    const result = await runCronTask(
      taskName,
      client,
      provider,
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    );
    if (taskName === "expire-jobs" && (result.expired?.length ?? 0) > 0)
      revalidateTag("jobs", "max");
    if (taskName === "expire-jobs") {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      await Promise.all(
        result.expired?.map((job) => {
          const jobUrl = new URL(`/jobs/${job.slug}`, siteUrl).toString();
          return submitGoogleIndexingBestEffort(jobUrl, "URL_DELETED");
        }) ?? [],
      );
    }
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error(JSON.stringify({ scope: "cron", task: taskName, result: "error" }));
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Cron task failed." },
      { status: 500 },
    );
  }
}
