import type { EmailMessage, EmailProvider, EmailSendResult } from "./types";

const sentMessages: EmailMessage[] = [];

export class FakeEmailProvider implements EmailProvider {
  readonly providerId = "fake";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    sentMessages.push(message);
    return { id: `fake-${sentMessages.length}` };
  }
}

export function resetFakeEmailMessages(): void {
  sentMessages.length = 0;
}

export function getFakeEmailMessages(): readonly EmailMessage[] {
  return sentMessages;
}
