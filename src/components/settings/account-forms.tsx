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
import { updateCompanyAction, updateProfileAction } from "@/lib/actions/account";
import {
  companySchema,
  profileUpdateSchema,
  type CompanyInput,
} from "@/lib/validation/auth";

type ActionState = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function useActionSubmit(action: (input: unknown) => Promise<ActionState>) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saved, setSaved] = useState(false);

  async function submit(values: unknown) {
    setSubmitError(null);
    setFieldErrors({});
    setSaved(false);
    const result = await action(values);
    if (!result.ok) {
      setSubmitError(result.error);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return { submit, submitError, fieldErrors, saved };
}

/** Account settings: display name. */
export function ProfileForm({ fullName }: { fullName: string | null }) {
  const { submit, submitError, fieldErrors, saved } = useActionSubmit(updateProfileAction);
  const { register, handleSubmit, formState } = useForm<z.input<typeof profileUpdateSchema>, unknown, { fullName: string | null }>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { fullName: fullName ?? "" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your name</CardTitle>
        <CardDescription>Shown on your dashboard and to reviewers.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Name"
            htmlFor="profile-name"
            errors={[formState.errors.fullName, { message: fieldErrors.fullName?.[0] }]}
          >
            <Input
              id="profile-name"
              autoComplete="name"
              aria-invalid={Boolean(formState.errors.fullName ?? fieldErrors.fullName)}
              {...register("fullName")}
            />
          </FormField>
          {submitError ? (
            <p role="alert" className="text-sm text-danger">
              {submitError}
            </p>
          ) : null}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={formState.isSubmitting}>
              Save name
            </Button>
            {saved ? <p className="text-sm text-fg-muted">Saved.</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/** Account settings: company profile fields the owner may edit. */
export function CompanyProfileForm({ company }: { company: { name: string; website: string | null; location: string | null; description: string | null } }) {
  const { submit, submitError, fieldErrors, saved } = useActionSubmit(updateCompanyAction);
  const { register, handleSubmit, formState } = useForm<z.input<typeof companySchema>, unknown, CompanyInput>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: company.name,
      website: company.website ?? "",
      location: company.location ?? "",
      description: company.description ?? "",
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company profile</CardTitle>
        <CardDescription>How your company appears on its page and listings.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
          <FormField
            label="Company name"
            htmlFor="settings-company-name"
            errors={[formState.errors.name, { message: fieldErrors.name?.[0] }]}
          >
            <Input
              id="settings-company-name"
              autoComplete="organization"
              aria-invalid={Boolean(formState.errors.name ?? fieldErrors.name)}
              {...register("name")}
            />
          </FormField>
          <FormField
            label="Website"
            htmlFor="settings-company-website"
            errors={[formState.errors.website, { message: fieldErrors.website?.[0] }]}
          >
            <Input
              id="settings-company-website"
              type="url"
              aria-invalid={Boolean(formState.errors.website ?? fieldErrors.website)}
              {...register("website")}
            />
          </FormField>
          <FormField
            label="Location"
            htmlFor="settings-company-location"
            errors={[formState.errors.location, { message: fieldErrors.location?.[0] }]}
          >
            <Input
              id="settings-company-location"
              aria-invalid={Boolean(formState.errors.location ?? fieldErrors.location)}
              {...register("location")}
            />
          </FormField>
          <FormField
            label="Short description"
            htmlFor="settings-company-description"
            errors={[formState.errors.description, { message: fieldErrors.description?.[0] }]}
          >
            <Textarea
              id="settings-company-description"
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
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={formState.isSubmitting}>
              Save company
            </Button>
            {saved ? <p className="text-sm text-fg-muted">Saved.</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
