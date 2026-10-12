import { ImageResponse } from "next/og";

import { getJobBySlug, type JobDetail } from "@/lib/data/jobs";
import { EMAIL_THEME } from "@/lib/email/theme";
import { formatEmploymentType, formatSalary } from "@/lib/jobs/format";

export const JOB_OG_SIZE = { width: 1200, height: 630 } as const;

function formatLocation(job: JobDetail): string {
  if (!job.isRemote) return job.location ?? "Location flexible";
  return job.remoteRegion ? `Remote · ${job.remoteRegion}` : "Remote";
}

export async function createJobOgImage(slug: string): Promise<Response> {
  const job = await getJobBySlug(slug);
  if (!job) return new Response("Job not found", { status: 404 });

  const title = job.title;
  const company = job.company.name;
  const salary = formatSalary(job);
  const location = formatLocation(job);
  const employment = formatEmploymentType(job.employmentType);

  return new ImageResponse(
    <div
      style={{
        background: EMAIL_THEME.background,
        color: EMAIL_THEME.text,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "space-between",
        padding: 72,
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            color: EMAIL_THEME.accent,
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          OPEN ROLES
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.08,
            maxWidth: 1020,
          }}
        >
          {title}
        </div>
        <div style={{ color: EMAIL_THEME.muted, display: "flex", fontSize: 34 }}>{company}</div>
      </div>
      <div style={{ alignItems: "center", display: "flex", fontSize: 26, gap: 18 }}>
        <div
          style={{
            background: EMAIL_THEME.panel,
            border: `2px solid ${EMAIL_THEME.border}`,
            borderRadius: 12,
            display: "flex",
            padding: "14px 20px",
          }}
        >
          {location}
        </div>
        <div
          style={{
            background: EMAIL_THEME.accent,
            borderRadius: 12,
            color: EMAIL_THEME.accentText,
            display: "flex",
            padding: "14px 20px",
          }}
        >
          {employment}
        </div>
        {salary ? (
          <div style={{ color: EMAIL_THEME.muted, display: "flex", padding: "14px 0" }}>
            {salary}
          </div>
        ) : null}
      </div>
    </div>,
    JOB_OG_SIZE,
  );
}
