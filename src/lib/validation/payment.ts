import { z } from "zod";

export const checkoutSelectionSchema = z.object({
  jobId: z.uuid("Job not found."),
  packageId: z.uuid("Choose a package."),
});

export type CheckoutSelection = z.infer<typeof checkoutSelectionSchema>;
