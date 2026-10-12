import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fake: vi.fn(() => ({ name: "fake" })),
  lemon: vi.fn(() => ({ name: "lemon" })),
}));

vi.mock("@/lib/payments/fake", () => ({ createFakePaymentProvider: mocks.fake }));
vi.mock("@/lib/payments/lemonsqueezy", () => ({ createLemonSqueezyProvider: mocks.lemon }));

import { getPaymentProvider } from "@/lib/payments";

describe("payment provider selection", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    mocks.fake.mockClear();
    mocks.lemon.mockClear();
  });

  it("selects the fake adapter only when explicitly configured", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "fake");
    vi.stubEnv("LEMONSQUEEZY_WEBHOOK_SECRET", "test-secret");
    expect(getPaymentProvider()).toEqual({ name: "fake" });
    expect(mocks.fake).toHaveBeenCalledWith("test-secret");
    expect(mocks.lemon).not.toHaveBeenCalled();
  });

  it("defaults to the Lemon Squeezy adapter", () => {
    vi.stubEnv("PAYMENT_PROVIDER", "lemonsqueezy");
    expect(getPaymentProvider()).toEqual({ name: "lemon" });
    expect(mocks.lemon).toHaveBeenCalledOnce();
    expect(mocks.fake).not.toHaveBeenCalled();
  });
});
