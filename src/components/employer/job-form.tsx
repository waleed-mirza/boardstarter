"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { CompanyLogo } from "@/components/jobs/company-logo";
import { FormField } from "@/components/patterns/form-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { createCheckout } from "@/lib/actions/payments";
import { postJob, updateJob } from "@/lib/actions/jobs";
import type { ActionResult } from "@/lib/actions/result";
import type { CompanySummary } from "@/lib/data/companies";
import type { EmployerJob } from "@/lib/data/jobs";
import type { CategoryRow, PackageRow, TagRow } from "@/lib/data/types";
import { useJobDraft } from "@/hooks/use-job-draft";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { jobSchema, type JobFormInput, type JobInput } from "@/lib/validation/job";

import { JobLivePreview } from "./job-live-preview";
import { MarkdownEditor } from "./markdown-editor";
import { PackageSelector } from "./package-selector";

const EMPLOYMENT_OPTIONS = [
  ["full_time", "Full-time"],
  ["part_time", "Part-time"],
  ["contract", "Contract"],
  ["temporary", "Temporary"],
  ["internship", "Internship"],
] as const;
const PERIOD_OPTIONS = [
  ["hour", "per hour"],
  ["day", "per day"],
  ["month", "per month"],
  ["year", "per year"],
] as const;

function defaultValues(job?: EmployerJob): JobFormInput {
  return {
    title: job?.title ?? "",
    descriptionMd: job?.description_md ?? "",
    categoryId: job?.category_id ?? "",
    employmentType: job?.employment_type ?? "full_time",
    location: job?.location ?? "",
    isRemote: job?.is_remote ?? false,
    remoteRegion: job?.remote_region ?? "",
    salaryMin: job?.salary_min ?? null,
    salaryMax: job?.salary_max ?? null,
    currency: job?.currency ?? "USD",
    salaryPeriod: (job?.salary_period as JobFormInput["salaryPeriod"] | undefined) ?? "year",
    applyMode: job?.apply_mode ?? "url",
    applyUrl: job?.apply_url ?? "",
    applyEmail: job?.apply_email ?? "",
    tagIds: job?.tagIds ?? [],
  };
}

function selectLabel(
  options: readonly (readonly [string, string])[],
  value: string | undefined,
  fallback: string,
) {
  return options.find(([option]) => option === value)?.[1] ?? fallback;
}

function submitButtonLabel(pending: boolean, mode: "create" | "edit"): string {
  if (pending) return "Saving…";
  return mode === "create" ? "Save draft" : "Save changes";
}

export function JobForm({
  userId,
  company,
  categories,
  tags,
  packages,
  job,
  mode,
  allowedApplyModes = ["url", "email", "onsite"],
}: {
  userId: string;
  company: CompanySummary;
  categories: readonly CategoryRow[];
  tags: readonly TagRow[];
  packages?: readonly PackageRow[];
  job?: EmployerJob;
  mode: "create" | "edit";
  allowedApplyModes?: readonly ("url" | "email" | "onsite")[];
}) {
  const [preview, setPreview] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverField, setServerField] = useState<string | undefined>();
  const [submitIntent, setSubmitIntent] = useState<"draft" | "checkout">("draft");
  const [selectedPackageId, setSelectedPackageId] = useState(packages?.[0]?.id ?? "");
  const [submitStarted, setSubmitStarted] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const form = useForm<JobFormInput, unknown, JobInput>({
    resolver: zodResolver(jobSchema),
    defaultValues: defaultValues(job),
    mode: "onBlur",
  });
  const values = {
    ...defaultValues(job),
    ...useWatch({ control: form.control }),
  } as JobFormInput;
  const visibleApplyModes = Array.from(new Set([
    ...allowedApplyModes,
    ...(values.applyMode ? [values.applyMode] : []),
  ]));
  const description = typeof values.descriptionMd === "string" ? values.descriptionMd : "";
  const storageKey = `boardstarter:job-draft:${userId}:${job?.id ?? "new"}`;
  const { restored, clear } = useJobDraft({ storageKey, watch: form.watch, reset: form.reset });
  useUnsavedChanges(form.formState.isDirty, pending);

  const errorFor = (field: string) =>
    serverField === field && serverError ? { message: serverError } : undefined;

  const onSubmit = form.handleSubmit((input) => {
    if (submitStarted) return;
    setSubmitStarted(true);
    setServerError(null);
    setServerField(undefined);
    startTransition(async () => {
      const result: ActionResult<{ jobId: string }> =
        mode === "create" ? await postJob(input) : await updateJob(job?.id ?? "", input);
      if (!result.ok) {
        setSubmitStarted(false);
        setServerError(result.error);
        setServerField(result.field);
        return;
      }
      if (mode === "create" && submitIntent === "checkout") {
        if (!selectedPackageId) {
          setSubmitStarted(false);
          setServerError("Choose a package before continuing to payment.");
          return;
        }
        const checkout = await createCheckout(result.data.jobId, selectedPackageId);
        if (!checkout.ok) {
          setSubmitStarted(false);
          setServerError(checkout.error);
          setServerField(checkout.field);
          return;
        }
        clear();
        form.reset(input);
        window.location.assign(checkout.data.url);
        return;
      }
      clear();
      form.reset(input);
      router.push("/dashboard");
    });
  });

  return (
    <div className="flex flex-col gap-8">
      {restored ? (
        <div
          role="status"
          className="flex items-center justify-between gap-4 border-l-2 border-accent bg-accent-subtle px-4 py-3 text-sm"
        >
          <span>Your saved draft was restored from this browser.</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              clear();
              form.reset(defaultValues(job));
            }}
          >
            Discard local copy
          </Button>
        </div>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-8" noValidate>
        <fieldset className="flex flex-col gap-5 border-b border-border pb-8">
          <legend className="mb-1 text-xl font-semibold tracking-tight">Role</legend>
          <FormField
            label="Job title"
            htmlFor="job-title"
            errors={[form.formState.errors.title, errorFor("title")]}
          >
            <Input
              id="job-title"
              placeholder="Senior Platform Engineer"
              aria-invalid={Boolean(form.formState.errors.title ?? errorFor("title"))}
              {...form.register("title")}
            />
          </FormField>
          <FormField
            label="Description"
            htmlFor="job-description"
            description={`${description.length.toLocaleString()} / 20,000 characters`}
            errors={[form.formState.errors.descriptionMd, errorFor("descriptionMd")]}
          >
            <Controller
              name="descriptionMd"
              control={form.control}
              render={({ field }) => (
                <MarkdownEditor
                  id="job-description"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={Boolean(
                    form.formState.errors.descriptionMd ?? errorFor("descriptionMd"),
                  )}
                />
              )}
            />
          </FormField>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Category"
              htmlFor="job-category"
              errors={[form.formState.errors.categoryId, errorFor("categoryId")]}
            >
              <Controller
                name="categoryId"
                control={form.control}
                render={({ field }) => {
                  const label = categories.find((category) => category.id === field.value)?.name;
                  return (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="job-category"
                        aria-invalid={Boolean(
                          form.formState.errors.categoryId ?? errorFor("categoryId"),
                        )}
                      >
                        <SelectValue placeholder="Choose a category">{label}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                }}
              />
            </FormField>
            <FormField
              label="Employment type"
              htmlFor="job-employment"
              errors={[form.formState.errors.employmentType, errorFor("employmentType")]}
            >
              <Controller
                name="employmentType"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="job-employment">
                      <SelectValue>
                        {selectLabel(EMPLOYMENT_OPTIONS, field.value, "Choose a type")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Location"
              htmlFor="job-location"
              errors={[form.formState.errors.location, errorFor("location")]}
            >
              <Input
                id="job-location"
                placeholder="Toronto, Canada"
                aria-invalid={Boolean(form.formState.errors.location ?? errorFor("location"))}
                {...form.register("location")}
              />
            </FormField>
            <FormField
              label="Remote region"
              htmlFor="job-remote-region"
              description="Optional — e.g. North America or Anywhere."
              errors={[form.formState.errors.remoteRegion, errorFor("remoteRegion")]}
            >
              <Input
                id="job-remote-region"
                placeholder="Anywhere"
                aria-invalid={Boolean(
                  form.formState.errors.remoteRegion ?? errorFor("remoteRegion"),
                )}
                {...form.register("remoteRegion")}
              />
            </FormField>
          </div>
          <Controller
            name="isRemote"
            control={form.control}
            render={({ field }) => (
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <Checkbox
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                This role can be performed remotely
              </label>
            )}
          />
          <Controller
            name="tagIds"
            control={form.control}
            render={({ field }) => {
              const selected = Array.isArray(field.value) ? field.value : [];
              return (
                <FormField
                  label="Tags"
                  description="Help candidates find this role."
                  errors={[form.formState.errors.tagIds, errorFor("tagIds")]}
                >
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                    {tags.map((tag) => (
                      <label
                        key={tag.id}
                        className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm hover:bg-bg-muted"
                      >
                        <Checkbox
                          checked={selected.includes(tag.id)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked === true
                                ? [...selected, tag.id]
                                : selected.filter((id) => id !== tag.id),
                            )
                          }
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                </FormField>
              );
            }}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-5 border-b border-border pb-8">
          <legend className="mb-1 text-xl font-semibold tracking-tight">Company</legend>
          <Card size="sm">
            <CardContent className="flex items-center gap-4 py-3">
              <CompanyLogo name={company.name} src={company.logo_url} size={48} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{company.name}</p>
                <p className="text-sm text-fg-muted">
                  {company.location ?? "Location not specified"}
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/settings">Edit company</Link>
              </Button>
            </CardContent>
          </Card>
        </fieldset>

        <fieldset className="flex flex-col gap-5 border-b border-border pb-8">
          <legend className="mb-1 text-xl font-semibold tracking-tight">Compensation</legend>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Minimum salary"
              htmlFor="job-salary-min"
              description="Optional; use whole units of the currency."
              errors={[form.formState.errors.salaryMin, errorFor("salaryMin")]}
            >
              {" "}
              <Input
                id="job-salary-min"
                type="number"
                min="0"
                inputMode="numeric"
                aria-invalid={Boolean(form.formState.errors.salaryMin ?? errorFor("salaryMin"))}
                {...form.register("salaryMin")}
              />
            </FormField>
            <FormField
              label="Maximum salary"
              htmlFor="job-salary-max"
              errors={[form.formState.errors.salaryMax, errorFor("salaryMax")]}
            >
              {" "}
              <Input
                id="job-salary-max"
                type="number"
                min="0"
                inputMode="numeric"
                aria-invalid={Boolean(form.formState.errors.salaryMax ?? errorFor("salaryMax"))}
                {...form.register("salaryMax")}
              />
            </FormField>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Currency"
              htmlFor="job-currency"
              errors={[form.formState.errors.currency, errorFor("currency")]}
            >
              {" "}
              <Input
                id="job-currency"
                maxLength={3}
                placeholder="USD"
                aria-invalid={Boolean(form.formState.errors.currency ?? errorFor("currency"))}
                {...form.register("currency")}
              />
            </FormField>
            <FormField
              label="Salary period"
              htmlFor="job-period"
              errors={[form.formState.errors.salaryPeriod, errorFor("salaryPeriod")]}
            >
              {" "}
              <Controller
                name="salaryPeriod"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="job-period">
                      <SelectValue>
                        {selectLabel(PERIOD_OPTIONS, field.value, "Choose a period")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PERIOD_OPTIONS.map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-5 border-b border-border pb-8">
          <legend className="mb-1 text-xl font-semibold tracking-tight">Application</legend>
          <FormField
            label="How should candidates apply?"
            errors={[form.formState.errors.applyMode, errorFor("applyMode")]}
          >
            <Controller
              name="applyMode"
              control={form.control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-label="Application method"
                  className="grid gap-3 sm:grid-cols-3"
                >
                  {visibleApplyModes.map((applyMode) => {
                    const labels = { url: "Application URL", email: "Email address", onsite: "Apply in person" } as const;
                    return (
                      <label key={applyMode} className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 text-sm">
                        <RadioGroupItem value={applyMode} />
                        {labels[applyMode]}
                      </label>
                    );
                  })}
                </RadioGroup>
              )}
            />
          </FormField>
          {values.applyMode === "url" ? (
            <FormField
              label="Application URL"
              htmlFor="job-apply-url"
              errors={[form.formState.errors.applyUrl, errorFor("applyUrl")]}
            >
              {" "}
              <Input
                id="job-apply-url"
                type="url"
                placeholder="https://example.com/apply"
                aria-invalid={Boolean(form.formState.errors.applyUrl ?? errorFor("applyUrl"))}
                {...form.register("applyUrl")}
              />
            </FormField>
          ) : null}
          {values.applyMode === "email" ? (
            <FormField
              label="Application email"
              htmlFor="job-apply-email"
              errors={[form.formState.errors.applyEmail, errorFor("applyEmail")]}
            >
              {" "}
              <Input
                id="job-apply-email"
                type="email"
                placeholder="jobs@example.com"
                aria-invalid={Boolean(form.formState.errors.applyEmail ?? errorFor("applyEmail"))}
                {...form.register("applyEmail")}
              />
            </FormField>
          ) : null}
        </fieldset>

        {mode === "create" && packages && packages.length > 0 ? (
          <fieldset className="flex flex-col gap-5 border-b border-border pb-8">
            <legend className="mb-1 text-xl font-semibold tracking-tight">Package</legend>
            <p className="text-sm text-fg-muted">
              Save a draft for free, or choose a package and continue to secure checkout.
            </p>
            <PackageSelector
              packages={packages}
              value={selectedPackageId}
              onValueChange={setSelectedPackageId}
            />
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-4">
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <Switch checked={preview} onCheckedChange={setPreview} />
            Show live preview
          </label>
          {preview ? (
            <JobLivePreview values={values} company={company} categories={categories} tags={tags} />
          ) : null}
        </div>
        {serverError && !serverField ? (
          <p role="alert" className="text-sm text-danger">
            {serverError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending} onClick={() => setSubmitIntent("draft")}>
            {submitButtonLabel(pending, mode)}
          </Button>
          {mode === "create" && packages && packages.length > 0 ? (
            <Button
              type="submit"
              variant="outline"
              disabled={pending || !selectedPackageId}
              onClick={() => setSubmitIntent("checkout")}
            >
              {pending ? "Starting checkout…" : "Continue to payment"}
            </Button>
          ) : null}
          <Button asChild type="button" variant="ghost">
            <Link href="/dashboard">Cancel</Link>
          </Button>
          <span className="text-sm text-fg-muted" aria-live="polite">
            {pending ? "Saving your draft…" : "Saved only to your employer dashboard."}
          </span>
        </div>
      </form>
    </div>
  );
}
