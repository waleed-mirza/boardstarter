import type { z } from "zod";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; field?: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string, field?: string): ActionResult<never> {
  return { ok: false, error, ...(field ? { field } : {}) };
}

export function fromZodError(error: z.ZodError): ActionResult<never> {
  const issue = error.issues[0];
  return fail(issue?.message ?? "Please fix the errors below.", issue?.path[0]?.toString());
}
