import { Button, Heading, Text } from "@react-email/components";

import { EMAIL_THEME } from "@/lib/email/theme";

import { EmailLayout } from "./email-layout";

export type PendingReviewEmailProps = { title: string; companyName: string; reviewUrl: string };

export function PendingReviewEmail({
  title,
  companyName,
  reviewUrl,
}: PendingReviewEmailProps): React.JSX.Element {
  return (
    <EmailLayout preview={`${title} is waiting for review`}>
      <Heading style={{ fontSize: 26, lineHeight: 1.2, margin: "0 0 12px" }}>
        A job is waiting for review
      </Heading>
      <Text style={{ color: EMAIL_THEME.muted, fontSize: 15, lineHeight: 1.6 }}>
        {title} from {companyName} is ready for an admin decision.
      </Text>
      <Button
        href={reviewUrl}
        style={{
          backgroundColor: EMAIL_THEME.accent,
          borderRadius: 6,
          color: EMAIL_THEME.accentText,
          display: "inline-block",
          fontSize: 14,
          fontWeight: 700,
          padding: "12px 18px",
          textDecoration: "none",
        }}
      >
        Open review queue
      </Button>
    </EmailLayout>
  );
}
