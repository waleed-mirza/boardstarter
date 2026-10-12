import { Button, Heading, Link, Text } from "@react-email/components";

import { EmailLayout } from "./email-layout";
import { EMAIL_THEME } from "@/lib/email/theme";

export type AlertConfirmationEmailProps = { confirmationUrl: string };

export function AlertConfirmationEmail({
  confirmationUrl,
}: AlertConfirmationEmailProps): React.JSX.Element {
  return (
    <EmailLayout preview="Confirm your job alert subscription">
      <Heading style={{ fontSize: 26, lineHeight: 1.2, margin: "0 0 12px" }}>
        Confirm your alerts
      </Heading>
      <Text style={{ color: EMAIL_THEME.muted, fontSize: 15, lineHeight: 1.6 }}>
        Click once to confirm this address and start receiving the job updates you selected.
      </Text>
      <Button
        href={confirmationUrl}
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
        Confirm subscription
      </Button>
      <Text style={{ color: EMAIL_THEME.muted, fontSize: 12, lineHeight: 1.5 }}>
        If the button does not work, copy this link:{" "}
        <Link href={confirmationUrl}>{confirmationUrl}</Link>
      </Text>
    </EmailLayout>
  );
}
