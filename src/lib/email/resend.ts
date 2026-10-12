import { Resend } from "resend";

import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export class ResendEmailProvider implements EmailProvider {
  readonly providerId = "resend";
  private readonly client: Resend;
  private readonly from: string;

  constructor(apiKey = required("RESEND_API_KEY"), from = required("EMAIL_FROM")) {
    this.client = new Resend(apiKey);
    this.from = from;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const result = await this.client.emails.send(
      {
        from: this.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      },
      message.idempotencyKey ? { idempotencyKey: message.idempotencyKey } : undefined,
    );
    if (result.error) throw new Error(result.error.message);
    return { id: result.data?.id };
  }
}
