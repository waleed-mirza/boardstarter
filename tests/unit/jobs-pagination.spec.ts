import { describe, expect, it } from "vitest";

import { getPaginationState } from "@/lib/jobs/filters";

describe("job pagination math", () => {
  it.each([
    [0, 0, { page: 1, pageCount: 1, start: 0, end: 0, hasPrevious: false, hasNext: false }],
    [1, 1, { page: 1, pageCount: 1, start: 1, end: 1, hasPrevious: false, hasNext: false }],
    [1, 41, { page: 1, pageCount: 3, start: 1, end: 20, hasPrevious: false, hasNext: true }],
    [3, 41, { page: 3, pageCount: 3, start: 41, end: 41, hasPrevious: true, hasNext: false }],
    [4, 41, { page: 4, pageCount: 3, start: 61, end: 41, hasPrevious: true, hasNext: false }],
  ])("handles page=%d total=%d", (page, total, expected) => {
    expect(getPaginationState(page, total)).toMatchObject(expected);
  });
});
