import { dispatchEmailQueue, type DispatchResult } from "@/lib/email/dispatch";
import type { EmailProvider } from "@/lib/email/types";
import { enqueueDueDigests, enqueueRenewalNudges } from "@/lib/data/email-queue";
import { expireDueJobs, keepSupabaseAlive, type ExpiredJobTarget } from "@/lib/data/automation";
import type { DatabaseClient } from "@/lib/data/types";

export const CRON_TASKS = ["expire-jobs", "send-digest", "renewal-nudges", "keep-alive"] as const;
export type CronTask = (typeof CRON_TASKS)[number];

export type CronTaskResult = {
  task: CronTask;
  expired?: ExpiredJobTarget[];
  queued?: number;
  delivery?: DispatchResult;
};

export function isCronTask(value: string): value is CronTask {
  return (CRON_TASKS as readonly string[]).includes(value);
}

export async function runCronTask(
  task: CronTask,
  client: DatabaseClient,
  provider: EmailProvider | null,
  siteUrl: string,
): Promise<CronTaskResult> {
  switch (task) {
    case "expire-jobs": {
      const expired = await expireDueJobs(client);
      return { task, expired };
    }
    case "send-digest": {
      const queued = await enqueueDueDigests(client);
      if (!provider) throw new Error("Email provider is required for send-digest.");
      return { task, queued, delivery: await dispatchEmailQueue(client, provider, siteUrl) };
    }
    case "renewal-nudges": {
      const queued = await enqueueRenewalNudges(client);
      if (!provider) throw new Error("Email provider is required for renewal-nudges.");
      return { task, queued, delivery: await dispatchEmailQueue(client, provider, siteUrl) };
    }
    case "keep-alive":
      await keepSupabaseAlive(client);
      return { task };
  }
}
