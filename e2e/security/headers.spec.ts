import { expect, test } from "@playwright/test";

test("public responses include the security header contract", async ({ request }) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  expect(response.headers()).toMatchObject({
    "content-security-policy": expect.stringContaining("default-src 'self'"),
    "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": expect.stringContaining("camera=()"),
  });
});
