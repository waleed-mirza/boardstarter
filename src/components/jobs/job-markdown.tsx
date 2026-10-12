import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { sanitizeJobMarkdown } from "@/lib/markdown/sanitize";

export function JobMarkdown({ source }: { source: string }) {
  const safeSource = sanitizeJobMarkdown(source);
  return (
    <div className="job-prose max-w-prose text-base text-fg">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {safeSource}
      </ReactMarkdown>
    </div>
  );
}
