import { z } from "zod";

export const alertSubscriptionSchema = z.object({
  email: z.email("Enter a valid email address."),
  categories: z.array(z.string().uuid()).default([]),
  frequency: z.enum(["daily", "weekly"]).default("weekly"),
});

export type AlertSubscriptionInput = z.infer<typeof alertSubscriptionSchema>;
