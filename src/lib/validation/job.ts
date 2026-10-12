import { z } from "zod";

import { sanitizeJobMarkdown } from "@/lib/markdown/sanitize";

const optionalText = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().trim().optional(),
);

const optionalMoney = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "string") return Number(value);
  return value;
}, z.number().int().nonnegative().nullable());

const optionalUrl = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z
    .string()
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "Enter a valid URL")
    .optional(),
);

const optionalEmail = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.email("Enter a valid email address").optional(),
);

export const jobSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(4, "Title must be at least 4 characters")
      .max(100, "Title must be 100 characters or fewer"),
    descriptionMd: z
      .string()
      .trim()
      .transform(sanitizeJobMarkdown)
      .refine((value) => value.length >= 100, "Description must be at least 100 characters")
      .refine((value) => value.length <= 20000, "Description must be 20,000 characters or fewer"),
    categoryId: z.uuid("Choose a category"),
    employmentType: z.enum(["full_time", "part_time", "contract", "temporary", "internship"]),
    location: optionalText,
    isRemote: z.boolean().default(false),
    remoteRegion: optionalText,
    salaryMin: optionalMoney,
    salaryMax: optionalMoney,
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/, "Use a three-letter uppercase currency"),
    salaryPeriod: z.enum(["hour", "day", "month", "year"]),
    applyMode: z.enum(["url", "email", "onsite"]),
    applyUrl: optionalUrl,
    applyEmail: optionalEmail,
    tagIds: z.array(z.uuid("Choose a valid tag")).max(20, "Choose 20 tags or fewer").default([]),
  })
  .superRefine((value, context) => {
    if (value.salaryMin !== null && value.salaryMax !== null && value.salaryMax < value.salaryMin) {
      context.addIssue({
        code: "custom",
        path: ["salaryMax"],
        message: "Salary maximum must be greater than or equal to salary minimum",
      });
    }

    if (value.applyMode === "url" && !value.applyUrl) {
      context.addIssue({
        code: "custom",
        path: ["applyUrl"],
        message: "An application URL is required",
      });
    }

    if (value.applyMode === "email" && !value.applyEmail) {
      context.addIssue({
        code: "custom",
        path: ["applyEmail"],
        message: "An application email is required",
      });
    }
  });

export type JobInput = z.output<typeof jobSchema>;
export type JobFormInput = z.input<typeof jobSchema>;
