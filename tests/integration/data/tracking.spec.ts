import { beforeAll, describe, expect, it } from "vitest";

import { POST } from "@/app/api/track/route";
import { getTrackingCookieName } from "@/lib/tracking/request";

import { anonClient, type TestClient } from "../helpers/supabase";

describe("public tracking endpoint", () => {
  let anonymous: TestClient;

  beforeAll(() => {
    anonymous = anonClient();
  });

  it("increments a view once and debounces a rapid repeat", async () => {
    const { data: job, error } = await anonymous
      .from("jobs")
      .select("id, views")
      .eq("slug", "senior-typescript-engineer")
      .single();
    expect(error).toBeNull();
    expect(job).not.toBeNull();
    if (!job) return;

    const request = (cookie?: string) =>
      new Request("https://boardstarter.test/api/track", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0 Chrome/140",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify({ jobId: job.id, kind: "view" }),
      });

    const first = await POST(request());
    expect(first.status).toBe(204);
    const setCookie = first.headers.get("set-cookie");
    expect(setCookie).toContain(getTrackingCookieName("view", job.id));

    const second = await POST(request(setCookie ?? ""));
    expect(second.status).toBe(204);
    expect(second.headers.get("set-cookie")).toBeNull();

    const { data: after, error: afterError } = await anonymous
      .from("jobs")
      .select("views, clicks")
      .eq("id", job.id)
      .single();
    expect(afterError).toBeNull();
    expect(after?.views).toBe(job.views + 1);

    const clickResponse = await POST(
      new Request("https://boardstarter.test/api/track", {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 Chrome/140" },
        body: JSON.stringify({ jobId: job.id, kind: "click" }),
      }),
    );
    expect(clickResponse.status).toBe(204);
    const { data: afterClick } = await anonymous.from("jobs").select("clicks").eq("id", job.id).single();
    expect(afterClick?.clicks).toBe((after?.clicks ?? 0) + 1);
  });
});
