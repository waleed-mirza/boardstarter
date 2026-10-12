import { describe, expect, it } from "vitest";

import { clearFixtureUsers } from "../../scripts/lib/db-reset";

describe("clearFixtureUsers", () => {
  it("clears restricted audit rows before fixture auth users", async () => {
    const queries: string[] = [];
    const client = {
      query: async (text: string) => {
        queries.push(text);
      },
    };

    await clearFixtureUsers(client);

    expect(queries).toHaveLength(3);
    expect(queries[0]).toMatch(/delete from public\.admin_actions/i);
    expect(queries[1]).toMatch(/delete from auth\.identities/i);
    expect(queries[2]).toMatch(/delete from auth\.users/i);
    expect(queries[0]).toMatch(/fixture-test/);
  });
});
