"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";


import { FormField } from "@/components/patterns/form-field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createCompanyAction } from "@/lib/actions/companies";
import { companySchema, type CompanyInput } from "@/lib/validation/auth";

/** Onboarding card: the first thing a new employer sees after verifying. */
export function CompanyForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [pending, setPending] = useState(false);

  // The schema preprocesses empty strings, so form values use its input type
  // while submit handlers receive the parsed output type.
  const { register, handleSubmit, formState } = useForm<
    z.input<typeof companySchema>,
    unknown,
    CompanyInput
  >({
    resolver: zodResolver(companySchema),
    defaultValues: { name: "", website: "", location: "", description: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    setFieldErrors({});
    setPending(true);
    const result = await createCompanyAction(values);
    setPending(false);
    if (!result.ok) {
      setSubmitError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    router.push("/dashboard");
    router.refresh();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your company</CardTitle>
        <CardDescription>
          Job seekers will see this on your listings. You can edit everything later.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Company name"
            htmlFor="company-name"
            errors={[formState.errors.name, { message: fieldErrors.name?.[0] }]}
          >
            <Input
              id="company-name"
              placeholder="Acme Rockets"
              autoComplete="organization"
              aria-invalid={Boolean(formState.errors.name ?? fieldErrors.name)}
              {...register("name")}
            />
          </FormField>
          <FormField
            label="Website"
            htmlFor="company-website"
            description="Optional — linked from your company page."
            errors={[formState.errors.website, { message: fieldErrors.website?.[0] }]}
          >
            <Input
              id="company-website"
              type="url"
              placeholder="https://acme.example.test"
              aria-invalid={Boolean(formState.errors.website ?? fieldErrors.website)}
              {...register("website")}
            />
          </FormField>
          <FormField
            label="Location"
            htmlFor="company-location"
            description="Optional — e.g. “Remote” or “Berlin, Germany”."
            errors={[formState.errors.location, { message: fieldErrors.location?.[0] }]}
          >
            <Input
              id="company-location"
              placeholder="Remote"
              aria-invalid={Boolean(formState.errors.location ?? fieldErrors.location)}
              {...register("location")}
            />
          </FormField>
          <FormField
            label="Short description"
            htmlFor="company-description"
            description="Optional — one or two sentences about the company."
            errors={[formState.errors.description, { message: fieldErrors.description?.[0] }]}
          >
            <Textarea
              id="company-description"
              rows={3}
              aria-invalid={Boolean(formState.errors.description ?? fieldErrors.description)}
              {...register("description")}
            />
          </FormField>
          {submitError ? (
            <p role="alert" className="text-sm text-danger">
              {submitError}
            </p>
          ) : null}
          <Button type="submit" disabled={formState.isSubmitting || pending}>
            {pending ? "Creating…" : "Create company"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
