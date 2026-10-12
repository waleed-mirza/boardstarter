import { createJobOgImage } from "@/lib/seo/job-og";

type Params = Promise<{ slug: string }>;

export async function GET(_request: Request, context: { params: Params }): Promise<Response> {
  const { slug } = await context.params;
  return createJobOgImage(slug);
}
