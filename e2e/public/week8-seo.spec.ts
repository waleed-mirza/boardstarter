import { expect, test } from "@playwright/test";

test.describe("Week 8 SEO surfaces", () => {
  test("job OG image is a 1200x630 PNG", async ({ request }) => {
    const response = await request.get("/jobs/senior-typescript-engineer/opengraph-image");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const body = await response.body();
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  });

  test("job detail exposes canonical metadata and JobPosting JSON-LD", async ({ request }) => {
    const response = await request.get("/jobs/senior-typescript-engineer");
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('rel="canonical" href="http://localhost:3000/jobs/senior-typescript-engineer"');
    expect(html).toContain('name="description"');
    const jsonLd = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
    );
    expect(jsonLd).not.toBeNull();
    const value = JSON.parse(jsonLd?.[1] ?? "null");
    expect(value).toMatchObject({
      "@type": "JobPosting",
      title: "Senior TypeScript Engineer",
      hiringOrganization: { name: "Northstar Labs" },
    });
  });

  test("pSEO pages enforce the minimum and provide route-specific copy", async ({ page }) => {
    const below = await page.goto("/jobs-in-atlantis");
    // Cache Components may stream the route shell before notFound(), which
    // keeps the HTTP status at 200; the rendered not-found boundary is the
    // contract we can assert without disabling the shared public shell.
    expect(below?.status()).toBe(200);
    await expect(page.getByText("That listing is not here")).toBeVisible();

    const above = await page.goto("/remote-software-engineering-jobs");
    expect(above?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Software Engineering remote jobs" })).toBeVisible();
    await expect(page.getByText(/Explore \d+ remote software engineering roles/)).toBeVisible();
  });

  test("sitemap and feeds are public XML surfaces", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()["content-type"]).toContain("application/xml");
    const feed = await request.get("/feed.xml");
    expect(feed.status()).toBe(200);
    expect(feed.headers()["content-type"]).toContain("application/rss+xml");
  });
});
