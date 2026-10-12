"use client";

import { useMemo, useState } from "react";

import { JobDetailView } from "@/components/jobs/job-detail";
import { JobRow } from "@/components/jobs/job-row";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CompanySummary } from "@/lib/data/companies";
import type { JobDetail, JobListItem } from "@/lib/data/jobs";
import type { CategoryRow, TagRow } from "@/lib/data/types";
import { sanitizeJobMarkdown } from "@/lib/markdown/sanitize";
import { jobSchema, type JobFormInput } from "@/lib/validation/job";

const PREVIEW_DATE = "2026-01-01T00:00:00.000Z";

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "temporary", "internship"] as const;
const APPLY_MODES = ["url", "email", "onsite"] as const;

function previewJob(
  values: JobFormInput,
  company: CompanySummary,
  category: CategoryRow | undefined,
  tags: readonly TagRow[],
): JobDetail {
  const parsed = jobSchema.safeParse(values);
  const data = parsed.success ? parsed.data : null;
  const employmentType = EMPLOYMENT_TYPES.includes(values.employmentType as (typeof EMPLOYMENT_TYPES)[number])
    ? values.employmentType as JobListItem["employmentType"]
    : "full_time";
  const applyMode = APPLY_MODES.includes(values.applyMode as (typeof APPLY_MODES)[number])
    ? values.applyMode as JobDetail["applyMode"]
    : "url";
  const title = typeof values.title === "string" && values.title.trim() ? values.title.trim() : "Your job title";
  const description = typeof values.descriptionMd === "string" && values.descriptionMd.trim()
    ? sanitizeJobMarkdown(values.descriptionMd)
    : "Your job description will appear here as you write it.";
  const tagIds = Array.isArray(values.tagIds) ? values.tagIds : [];
  const selectedTags = tags.filter((tag) => tagIds.includes(tag.id)).map((tag) => tag.slug);
  const salaryMin = data?.salaryMin ?? (typeof values.salaryMin === "number" ? values.salaryMin : null);
  const salaryMax = data?.salaryMax ?? (typeof values.salaryMax === "number" ? values.salaryMax : null);
  const isRemote = values.isRemote === true;
  const location = typeof values.location === "string" && values.location.trim() ? values.location.trim() : null;
  const remoteRegion = typeof values.remoteRegion === "string" && values.remoteRegion.trim() ? values.remoteRegion.trim() : null;
  const applyUrl = typeof values.applyUrl === "string" && values.applyUrl.trim() ? values.applyUrl : null;
  const applyEmail = typeof values.applyEmail === "string" && values.applyEmail.trim() ? values.applyEmail : null;
  const item: JobListItem = {
    id: "preview-job",
    companyId: company.id,
    title,
    slug: "preview-job",
    categoryId: category?.id ?? "preview-category",
    categoryName: category?.name ?? "Category",
    categorySlug: category?.slug ?? "category",
    employmentType,
    location,
    isRemote,
    remoteRegion,
    salaryMin,
    salaryMax,
    currency: typeof values.currency === "string" && /^[A-Z]{3}$/.test(values.currency) ? values.currency : "USD",
    salaryPeriod: typeof values.salaryPeriod === "string" ? values.salaryPeriod : "year",
    isFeatured: false,
    publishedAt: PREVIEW_DATE,
    expiresAt: "2026-12-31T00:00:00.000Z",
    published_at: PREVIEW_DATE,
    expires_at: "2026-12-31T00:00:00.000Z",
    createdAt: PREVIEW_DATE,
    company: { name: company.name, slug: company.slug, logoUrl: company.logo_url },
    tags: selectedTags,
  };
  return {
    ...item,
    descriptionMd: description,
    applyMode,
    applyUrl,
    applyEmail,
    companyWebsite: company.website,
    companyDescription: company.description,
    companyLocation: company.location,
    updatedAt: PREVIEW_DATE,
    status: "draft",
    isExpired: false,
    asOf: PREVIEW_DATE,
  };
}

export function JobLivePreview({
  values,
  company,
  categories,
  tags,
}: {
  values: JobFormInput;
  company: CompanySummary;
  categories: readonly CategoryRow[];
  tags: readonly TagRow[];
}) {
  const [tab, setTab] = useState("row");
  const job = useMemo(() => {
    const category = categories.find((item) => item.id === values.categoryId);
    return previewJob(values, company, category, tags);
  }, [categories, company, tags, values]);

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Live preview</CardTitle>
            <p className="mt-1 text-sm text-fg-muted">This is how your draft will look on the board.</p>
          </div>
          <Badge variant="outline">Draft</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="Preview type">
            <TabsTrigger value="row">Job row</TabsTrigger>
            <TabsTrigger value="detail">Detail page</TabsTrigger>
          </TabsList>
          <TabsContent value="row" className="mt-4 overflow-hidden rounded-lg border border-border">
            <JobRow job={job} asOf={PREVIEW_DATE} preview />
          </TabsContent>
          <TabsContent value="detail" className="mt-4 overflow-hidden rounded-lg border border-border">
            <JobDetailView job={job} moreJobs={[]} mode="preview" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
