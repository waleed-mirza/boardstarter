import { createJobOgImage, JOB_OG_SIZE } from "@/lib/seo/job-og";

export const alt = "Job listing";
export const size = JOB_OG_SIZE;
export const contentType = "image/png";

type Params = Promise<{ slug: string }>;

export default async function Image({ params }: { params: Params }): Promise<Response> {
  const { slug } = await params;
  return createJobOgImage(slug);
}
