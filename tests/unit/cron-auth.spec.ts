import { describe, expect, it } from "vitest";

import { isAuthorizedCronRequest } from "@/lib/cron/auth";

describe("cron authorization", () => {
  it("requires an exact bearer secret", () => {
    const request = (value: string) => new Request("https://jobs.example.com/api/cron/keep-alive", { headers: { authorization: `Bearer ${value}` } });
    expect(isAuthorizedCronRequest(request("secret"), "secret")).toBe(true);
    expect(isAuthorizedCronRequest(request("SECRET"), "secret")).toBe(false);
    expect(isAuthorizedCronRequest(new Request("https://jobs.example.com"), "secret")).toBe(false);
  });
});
