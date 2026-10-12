import { Heading, Link, Text } from "@react-email/components";

import type { DigestJob } from "@/lib/email/types";
import { EMAIL_THEME } from "@/lib/email/theme";

import { EmailLayout } from "./email-layout";

export type JobDigestEmailProps = {
  jobs: DigestJob[];
  frequency: "daily" | "weekly";
  unsubscribeUrl: string;
  siteUrl: string;
};

function salary(job: DigestJob): string | null {
  if (job.salaryMin === null && job.salaryMax === null) return null;
  if (job.salaryMin !== null && job.salaryMax !== null)
    return `${job.currency} ${job.salaryMin.toLocaleString()}–${job.salaryMax.toLocaleString()}`;
  const value = job.salaryMin ?? job.salaryMax;
  return value === null ? null : `${job.currency} ${value.toLocaleString()}`;
}

export function JobDigestEmail({
  jobs,
  frequency,
  unsubscribeUrl,
  siteUrl,
}: JobDigestEmailProps): React.JSX.Element {
  return (
    <EmailLayout
      preview={`${jobs.length} new ${frequency} job ${jobs.length === 1 ? "match" : "matches"}`}
    >
      <Heading style={{ fontSize: 26, lineHeight: 1.2, margin: "0 0 12px" }}>
        Your {frequency} job note
      </Heading>
      <Text style={{ color: EMAIL_THEME.muted, fontSize: 15, lineHeight: 1.6 }}>
        Here are the newest roles matching your alert preferences.
      </Text>
      {jobs.map((job) => {
        const details = [
          job.companyName,
          job.location ?? (job.isRemote ? "Remote" : null),
          salary(job),
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <div
            key={job.id}
            style={{ borderTop: `1px solid ${EMAIL_THEME.border}`, padding: "16px 0" }}
          >
            <Link
              href={new URL(`/jobs/${job.slug}`, siteUrl).toString()}
              style={{
                color: EMAIL_THEME.text,
                fontSize: 17,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {job.title}
            </Link>
            <Text style={{ color: EMAIL_THEME.muted, fontSize: 13, margin: "6px 0 0" }}>
              {details}
            </Text>
          </div>
        );
      })}
      <Text style={{ color: EMAIL_THEME.muted, fontSize: 12, lineHeight: 1.5 }}>
        No longer interested? <Link href={unsubscribeUrl}>Unsubscribe from these alerts</Link>.
      </Text>
    </EmailLayout>
  );
}
