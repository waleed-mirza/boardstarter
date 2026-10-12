import { z } from "zod";

export const applicationSchema = z.object({
  jobId: z.string().uuid(),
  name: z.string().trim().min(1, "Enter your name.").max(120),
  email: z.email("Enter a valid email address."),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
