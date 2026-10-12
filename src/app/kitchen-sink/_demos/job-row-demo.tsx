import { JobRow } from "@/components/jobs/job-row";
import type { JobListItem } from "@/lib/data/jobs";

const baseJob: JobListItem = {
  id: "00000000-0000-4000-8000-000000000001",
  companyId: "00000000-0000-4000-8000-000000000002",
  title: "Product Engineer",
  slug: "product-engineer-demo",
  categoryId: "00000000-0000-4000-8000-000000000003",
  categoryName: "Software Engineering",
  categorySlug: "software-engineering",
  employmentType: "full_time",
  location: "Toronto, Canada",
  isRemote: false,
  remoteRegion: null,
  salaryMin: 110000,
  salaryMax: 145000,
  currency: "USD",
  salaryPeriod: "year",
  isFeatured: false,
  publishedAt: "2026-09-06T00:00:00Z",
  expiresAt: "2026-10-06T00:00:00Z",
  published_at: "2026-09-06T00:00:00Z",
  expires_at: "2026-10-06T00:00:00Z",
  createdAt: "2026-09-05T00:00:00Z",
  company: { name: "Northstar Labs", slug: "northstar-labs", logoUrl: "https://images.example.test/northstar.svg" },
  tags: ["typescript"],
};

const states: Array<[string, JobListItem]> = [
  ["default", baseJob],
  ["featured", { ...baseJob, id: "00000000-0000-4000-8000-000000000011", isFeatured: true }],
  ["remote", { ...baseJob, id: "00000000-0000-4000-8000-000000000012", isRemote: true, remoteRegion: "North America", location: "Remote" }],
  ["no-salary", { ...baseJob, id: "00000000-0000-4000-8000-000000000013", salaryMin: null, salaryMax: null }],
  ["long-title", { ...baseJob, id: "00000000-0000-4000-8000-000000000014", title: "Staff Product Engineer, Developer Experience and Platform Foundations" }],
  ["missing-logo", { ...baseJob, id: "00000000-0000-4000-8000-000000000015", company: { ...baseJob.company, logoUrl: null } }],
];

export function JobRowDemo() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg">
      {states.map(([state, job]) => (
        <div key={state} data-testid={`job-row-demo-${state}`}>
          <p className="border-b border-border bg-bg-subtle px-4 py-2 text-xs font-medium text-fg-subtle">{state}</p>
          <JobRow job={job} asOf="2026-09-07T00:00:00Z" />
        </div>
      ))}
    </div>
  );
}
