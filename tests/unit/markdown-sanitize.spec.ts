import { describe, expect, it } from "vitest";

import { sanitizeJobMarkdown } from "@/lib/markdown/sanitize";

describe("sanitizeJobMarkdown", () => {
  it("removes executable HTML and unsafe link protocols", () => {
    const sanitized = sanitizeJobMarkdown(
      '# Role\n\n<script>alert("x")</script>\n\n<img src="x" onerror="alert(1)">\n\n<iframe src="https://evil.test"></iframe>\n\n[bad](javascript:alert(1))',
    );
    expect(sanitized).not.toMatch(/script|onerror|iframe|javascript:/i);
  });

  it("preserves headings, lists, safe links, and code fences", () => {
    const sanitized = sanitizeJobMarkdown(
      "## Responsibilities\n\n- Build useful tools\n- Review careful code\n\n[Read more](https://example.test/role)\n\n```ts\nexport const ready = true\n```",
    );
    expect(sanitized).toContain("## Responsibilities");
    expect(sanitized).toMatch(/(?:-|\*) Build useful tools/);
    expect(sanitized).toContain("https://example.test/role");
    expect(sanitized).toContain("export const ready = true");
  });

  it("is stable for empty input", () => {
    expect(sanitizeJobMarkdown("")).toBe("");
  });
});
