import { Body, Container, Head, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

import { EMAIL_THEME } from "@/lib/email/theme";

export type EmailLayoutProps = { preview: string; children: ReactNode };

export function EmailLayout({ preview, children }: EmailLayoutProps): React.JSX.Element {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          backgroundColor: EMAIL_THEME.panel,
          color: EMAIL_THEME.text,
          fontFamily: "Arial, sans-serif",
          margin: 0,
          padding: "32px 12px",
        }}
      >
        <Container
          style={{
            backgroundColor: EMAIL_THEME.background,
            border: `1px solid ${EMAIL_THEME.border}`,
            borderRadius: 8,
            margin: "0 auto",
            maxWidth: 600,
            padding: 32,
          }}
        >
          <Section>
            <Text
              style={{
                color: EMAIL_THEME.accent,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.08em",
                margin: "0 0 24px",
                textTransform: "uppercase",
              }}
            >
              Job alerts
            </Text>
            {children}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
