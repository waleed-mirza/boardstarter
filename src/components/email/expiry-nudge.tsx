import { Button, Heading, Text } from "@react-email/components";

import { EMAIL_THEME } from "@/lib/email/theme";

import { EmailLayout } from "./email-layout";

export type ExpiryNudgeEmailProps = {
  title: string;
  companyName: string;
  jobUrl: string;
  expiresAt: string;
};

export function ExpiryNudgeEmail({
  title,
  companyName,
  jobUrl,
  expiresAt,
}: ExpiryNudgeEmailProps): React.JSX.Element {
  return (
    <EmailLayout preview={`${title} expires in 3 days`}>
      <Heading style={{ fontSize: 26, lineHeight: 1.2, margin: "0 0 12px" }}>
        Renew before it expires
      </Heading>
      <Text style={{ color: EMAIL_THEME.muted, fontSize: 15, lineHeight: 1.6 }}>
        {title} at {companyName} expires on {new Date(expiresAt).toLocaleDateString()}.
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
        Renew listing
      </Button>
    </EmailLayout>
  );
}
