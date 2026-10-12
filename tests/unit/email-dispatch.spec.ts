import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  claimEmailQueue: vi.fn(),
  markEmailSent: vi.fn(),
  markEmailFailed: vi.fn(),
  renderEmail: vi.fn(),
  signAlertToken: vi.fn(() => "signed-token"),
}));

vi.mock("@/lib/data/email-queue", () => ({
  claimEmailQueue: mocks.claimEmailQueue,
  markEmailSent: mocks.markEmailSent,
  markEmailFailed: mocks.markEmailFailed,
}));
vi.mock("@/lib/email/render", () => ({ renderEmail: mocks.renderEmail }));
vi.mock("@/lib/email/tokens", () => ({ signAlertToken: mocks.signAlertToken }));

import { dispatchEmailQueue } from "@/lib/email/dispatch";

describe("email queue dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.claimEmailQueue.mockResolvedValue({
      claimToken: "claim-1",
      items: [
        {
          id: "queue-1",
          to_email: "person@example.com",
          template: "alert_confirmation",
          payload: { email: "person@example.com", token: "database-nonce" },
          dedupe_key: "alert-confirm:queue-1",
        },
      ],
    });
    mocks.renderEmail.mockResolvedValue({
      to: "person@example.com",
      template: "alert_confirmation",
      subject: "Confirm",
      payload: {},
      html: "<html>",
      text: "Confirm",
    });
    mocks.markEmailSent.mockResolvedValue(true);
  });

  it("signs confirmation links only while dispatching queued mail", async () => {
    const provider = {
      providerId: "fake",
      send: vi.fn(async () => ({ id: "provider-1" })),
    };

    await expect(
      dispatchEmailQueue({} as never, provider, "https://jobs.example.com", 10),
    ).resolves.toEqual({ claimed: 1, sent: 1, failed: 0 });

    expect(mocks.signAlertToken).toHaveBeenCalledWith({
      email: "person@example.com",
      nonce: "database-nonce",
      purpose: "confirm",
    });
    expect(mocks.renderEmail).toHaveBeenCalledWith(
      "alert_confirmation",
      "person@example.com",
      {
        email: "person@example.com",
        confirmationUrl: "https://jobs.example.com/alerts/confirm?token=signed-token",
      },
      "https://jobs.example.com",
      "alert-confirm:queue-1",
    );
    expect(provider.send).toHaveBeenCalledTimes(1);
    expect(mocks.markEmailSent).toHaveBeenCalledWith({}, "queue-1", "claim-1", "provider-1");
  });
});
