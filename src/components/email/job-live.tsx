import { Button, Heading, Text } from "@react-email/components";

import { EMAIL_THEME } from "@/lib/email/theme";

import { EmailLayout } from "./email-layout";

export type JobLiveEmailProps = {
  title: string;
  companyName: string;
  jobUrl: string;
  expiresAt: string;
};

export function JobLiveEmail({
  title,
  companyName,
  jobUrl,
  expiresAt,
}: JobLiveEmailProps): React.JSX.Element {
  return (
    <EmailLayout preview={`${title} is live`}>
      <Heading style={{ fontSize: 26, lineHeight: 1.2, margin: "0 0 12px" }}>
        Your job is live
      </Heading>
      <Text style={{ color: EMAIL_THEME.muted, fontSize: 15, lineHeight: 1.6 }}>
        {title} at {companyName} is now visible on the board.
      </Text>
      <Button
        href={jobUrl}
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
        View listing
      </Button>
      <Text style={{ color: EMAIL_THEME.muted, fontSize: 12 }}>
        The listing is scheduled to expire on {new Date(expiresAt).toLocaleDateString()}.
      </Text>
    </EmailLayout>
  );
}
