import { z } from "zod";

export const trackingEventSchema = z.object({
  jobId: z.string().uuid(),
  kind: z.enum(["view", "click"]),
});

export type TrackingEvent = z.infer<typeof trackingEventSchema>;
