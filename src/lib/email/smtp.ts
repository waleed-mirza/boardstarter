import nodemailer, { type Transporter } from "nodemailer";

import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

export class SmtpEmailProvider implements EmailProvider {
  readonly providerId = "smtp";
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(
    host = process.env.EMAIL_SMTP_HOST ?? "127.0.0.1",
    port = Number(process.env.EMAIL_SMTP_PORT ?? 1025),
    from = process.env.EMAIL_FROM ?? "Jobs <jobs@example.test>",
  ) {
    this.transporter = nodemailer.createTransport({ host, port, secure: false });
    this.from = from;
  }

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const result = await this.transporter.sendMail({
      from: this.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: message.idempotencyKey
        ? { "X-Boardstarter-Idempotency-Key": message.idempotencyKey }
        : undefined,
    });
    return { id: result.messageId };
  }
}
