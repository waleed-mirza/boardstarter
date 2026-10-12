import "server-only";

import { FakeEmailProvider } from "./fake";
import { ResendEmailProvider } from "./resend";
import { SmtpEmailProvider } from "./smtp";
import type { EmailProvider } from "./types";

export function getEmailProvider(): EmailProvider {
  switch (process.env.EMAIL_PROVIDER ?? "resend") {
    case "fake":
      return new FakeEmailProvider();
    case "smtp":
      return new SmtpEmailProvider();
    case "resend":
      return new ResendEmailProvider();
    default:
      throw new Error("Unsupported EMAIL_PROVIDER");
  }
}

export type { EmailProvider } from "./types";
