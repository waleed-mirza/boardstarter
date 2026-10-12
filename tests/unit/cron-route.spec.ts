import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(() => ({ client: "admin" })),
  getEmailProvider: vi.fn(() => ({ providerId: "fake" })),
  revalidateTag: vi.fn(),
  runCronTask: vi.fn(),
  submitGoogleIndexingBestEffort: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/automation/tasks", () => ({
  isCronTask: (value: string) =>
    ["expire-jobs", "send-digest", "renewal-nudges", "keep-alive"].includes(value),
  runCronTask: mocks.runCronTask,
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.createAdminClient }));
vi.mock("@/lib/email", () => ({ getEmailProvider: mocks.getEmailProvider }));
vi.mock("@/lib/seo/indexing", () => ({
  submitGoogleIndexingBestEffort: mocks.submitGoogleIndexingBestEffort,
}));

import { GET } from "@/app/api/cron/[task]/route";

const originalCronSecret = process.env.CRON_SECRET;

function request(secret?: string): Request {
  return new Request("https://jobs.example.com/api/cron/keep-alive", {
    headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
  });
}

function context(task: string) {
  return { params: Promise.resolve({ task }) };
}

describe("cron route", () => {
  beforeEach(() => {
    process.env.CRON_SECRET = "week8-cron-secret";
    vi.clearAllMocks();
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it("returns 401 for missing or incorrect bearer credentials", async () => {
    await expect(GET(request(), context("keep-alive"))).resolves.toMatchObject({ status: 401 });
    await expect(GET(request("wrong-secret"), context("keep-alive"))).resolves.toMatchObject({
      status: 401,
    });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("rejects unknown tasks after authentication", async () => {
    await expect(GET(request("week8-cron-secret"), context("not-a-task"))).resolves.toMatchObject({
      status: 404,
    });
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("runs keep-alive without constructing an email provider", async () => {
    mocks.runCronTask.mockResolvedValue({ task: "keep-alive" });
    const response = await GET(request("week8-cron-secret"), context("keep-alive"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, task: "keep-alive" });
    expect(mocks.runCronTask).toHaveBeenCalledWith(
      "keep-alive",
      { client: "admin" },
      null,
      "http://localhost:3000",
    );
    expect(mocks.getEmailProvider).not.toHaveBeenCalled();
  });

  it("revalidates expired jobs and notifies Google best-effort", async () => {
    mocks.runCronTask.mockResolvedValue({
      task: "expire-jobs",
      expired: [{ id: "job-1", slug: "engineer-acme", expires_at: "2026-01-01T00:00:00Z" }],
    });
    const response = await GET(request("week8-cron-secret"), context("expire-jobs"));
    expect(response.status).toBe(200);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("jobs", "max");
    expect(mocks.submitGoogleIndexingBestEffort).toHaveBeenCalledWith(
      "http://localhost:3000/jobs/engineer-acme",
      "URL_DELETED",
    );
  });
});
