import { beforeEach, describe, expect, it, vi } from "vitest";

const { cacheLifeMock, cacheTagMock, createPublicClientMock, rpcMock, fromMock } = vi.hoisted(() => ({
  cacheLifeMock: vi.fn(),
  cacheTagMock: vi.fn(),
  createPublicClientMock: vi.fn(),
  rpcMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ cacheLife: cacheLifeMock, cacheTag: cacheTagMock }));
vi.mock("@/lib/supabase/server", () => ({ createPublicClient: createPublicClientMock }));

import {
  getPublicCompanyBySlug,
  listPublicCompanies,
  updateCompany,
} from "@/lib/data/companies";
import {
  getJobBySlug,
  getJobsForCategorySlug,
  getJobsForCompanySlug,
  getJobsForTagSlug,
  listPublishedJobs,
} from "@/lib/data/jobs";
import { getCachedPublicSiteConfig, toPublicSiteConfig } from "@/lib/data/settings";
import { getHomePageData, getPublicBoardStats, getPublicJobFacets } from "@/lib/data/stats";
import {
  getPublicCategoryBySlug,
  getPublicTagBySlug,
  listPublicCategories,
  listPublicTags,
} from "@/lib/data/taxonomy";
import type { DatabaseClient } from "@/lib/data/types";

const now = "2026-09-07T00:00:00.000Z";

const listItem = {
  id: "job-1",
  company_id: "company-1",
  title: "Platform Engineer",
  slug: "platform-engineer",
  category_id: "category-1",
  category_name: "Software Engineering",
  category_slug: "software-engineering",
  employment_type: "full_time" as const,
  location: "Remote",
  is_remote: true,
  remote_region: "Anywhere",
  salary_min: 120000,
  salary_max: 160000,
  currency: "USD",
  salary_period: "year",
  is_featured: true,
  effective_featured: true,
  published_at: now,
  expires_at: "2026-10-07T00:00:00.000Z",
  created_at: now,
  company_name: "Northstar Labs",
  company_slug: "northstar-labs",
  company_logo_url: null,
  tag_slugs: ["typescript"],
};

const detail = {
  ...listItem,
  description_md: "## Role",
  apply_mode: "url" as const,
  apply_url: "https://example.test/apply",
  apply_email: null,
  company_website: "https://example.test",
  company_description: "A useful team.",
  company_location: "Toronto, Canada",
  updated_at: now,
  status: "published" as const,
  is_expired: false,
  as_of: now,
};

const listPayload = {
  data: [listItem],
  page: 1,
  pageSize: 20,
  total: 1,
  hasNext: false,
  asOf: now,
};

const company = {
  id: "company-1",
  name: "Northstar Labs",
  slug: "northstar-labs",
  logo_url: null,
  website: "https://example.test",
  description: "A useful team.",
  location: "Toronto, Canada",
  live_job_count: 1,
};

const facets = {
  categories: [{ value: "software-engineering", label: "Software Engineering", count: 1 }],
  employmentTypes: [{ value: "full_time", label: "Full time", count: 1 }],
  workModes: [{ value: "remote", label: "Remote", count: 1 }],
  locations: [{ value: "Remote", label: "Remote", count: 1 }],
  tags: [{ value: "typescript", label: "TypeScript", count: 1 }],
  salaryBands: [{ value: "under-75k", label: "Under $75k", count: 0 }],
};

const stats = {
  jobCount: 1,
  companyCount: 1,
  latestPublishedAt: now,
  asOf: now,
};

const categories = [{ id: "category-1", slug: "software-engineering", name: "Software Engineering", sort: 1, created_at: now }];
const tags = [{ id: "tag-1", slug: "typescript", name: "TypeScript", created_at: now }];
const settingsRows = [
  { key: "site_name", value: "Remote Work Exchange" },
  { key: "tagline", value: "A calm board." },
  { key: "default_currency", value: "USD" },
];

const categoryBuilder = {
  select: vi.fn(),
  order: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};
const tagBuilder = {
  select: vi.fn(),
  order: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
};
const companyBuilder = {
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  single: vi.fn(),
};

const client = { rpc: rpcMock, from: fromMock } as unknown as DatabaseClient;

function resetBuilders() {
  categoryBuilder.select.mockReturnValue(categoryBuilder);
  categoryBuilder.order.mockResolvedValue({ data: categories, error: null });
  categoryBuilder.eq.mockReturnValue(categoryBuilder);
  categoryBuilder.maybeSingle.mockResolvedValue({ data: categories[0], error: null });

  tagBuilder.select.mockReturnValue(tagBuilder);
  tagBuilder.order.mockResolvedValue({ data: tags, error: null });
  tagBuilder.eq.mockReturnValue(tagBuilder);
  tagBuilder.maybeSingle.mockResolvedValue({ data: tags[0], error: null });

  companyBuilder.update.mockReturnValue(companyBuilder);
  companyBuilder.eq.mockReturnValue(companyBuilder);
  companyBuilder.select.mockReturnValue(companyBuilder);
  companyBuilder.single.mockResolvedValue({ data: { ...company }, error: null });

  fromMock.mockImplementation((table: string) => {
    if (table === "site_settings") {
      return { select: vi.fn().mockResolvedValue({ data: settingsRows, error: null }) };
    }
    if (table === "categories") return categoryBuilder;
    if (table === "tags") return tagBuilder;
    return companyBuilder;
  });
}

describe("cached public data wrappers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetBuilders();
    createPublicClientMock.mockReturnValue(client);
    rpcMock.mockImplementation(async (name: string) => {
      if (name === "search_public_jobs") return { data: listPayload, error: null };
      if (name === "get_public_job_by_slug") return { data: detail, error: null };
      if (name === "get_public_company_by_slug") return { data: company, error: null };
      if (name === "list_public_companies") return { data: [company], error: null };
      if (name === "get_public_board_stats") return { data: stats, error: null };
      if (name === "get_public_job_facets") return { data: facets, error: null };
      throw new Error(`unexpected RPC ${name}`);
    });
  });

  it("covers cached list, detail, company, stats, taxonomy, and settings reads", async () => {
    await expect(getPublicCompanyBySlug("northstar-labs")).resolves.toMatchObject({ liveJobCount: 1 });
    await expect(listPublicCompanies()).resolves.toHaveLength(1);
    await expect(listPublishedJobs({ featuredOnly: true }, 2, 5)).resolves.toMatchObject({ total: 1 });
    await expect(getJobBySlug("platform-engineer")).resolves.toMatchObject({ title: "Platform Engineer" });
    await expect(getJobsForCompanySlug("northstar-labs", 2)).resolves.toMatchObject({ total: 1 });
    await expect(getJobsForCategorySlug("software-engineering")).resolves.toMatchObject({ total: 1 });
    await expect(getJobsForTagSlug("typescript")).resolves.toMatchObject({ total: 1 });

    await expect(getCachedPublicSiteConfig()).resolves.toMatchObject({ siteName: "Remote Work Exchange" });
    await expect(getPublicBoardStats()).resolves.toMatchObject({ jobCount: 1 });
    await expect(getPublicJobFacets()).resolves.toMatchObject({
      categories: [{ value: "software-engineering" }],
    });
    await expect(getHomePageData()).resolves.toMatchObject({ latest: { total: 1 } });

    await expect(listPublicCategories()).resolves.toEqual(categories);
    await expect(listPublicTags()).resolves.toEqual(tags);
    await expect(getPublicCategoryBySlug("software-engineering")).resolves.toEqual(categories[0]);
    await expect(getPublicTagBySlug("typescript")).resolves.toEqual(tags[0]);
    expect(cacheLifeMock).toHaveBeenCalled();
    expect(cacheTagMock).toHaveBeenCalledWith("jobs");
  });

  it("covers the client overloads and owner update projection", async () => {
    await expect(listPublishedJobs(client, { query: "platform" }, 3)).resolves.toMatchObject({ page: 1 });
    await expect(getJobBySlug(client, "platform-engineer")).resolves.toMatchObject({ slug: "platform-engineer" });
    await expect(updateCompany(client, "company-1", { name: "Northstar Labs Updated" })).resolves.toMatchObject({
      name: "Northstar Labs",
    });
  });

  it("uses safe defaults for malformed footer links", () => {
    expect(
      toPublicSiteConfig({
        site_name: "Board",
        footer_links: [null, "bad", { label: "Missing href" }, { label: "Docs", href: "/docs" }],
      }),
    ).toMatchObject({
      siteName: "Board",
      footerLinks: [{ label: "Docs", href: "/docs" }],
    });
  });
});
