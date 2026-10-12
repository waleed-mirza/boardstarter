import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { Link, Root } from "mdast";
import type { Node } from "unist";

function safeUrl(value: string): boolean {
  const trimmed = value.trim();
  if ((trimmed.startsWith("/") && !trimmed.startsWith("//")) || trimmed.startsWith("#")) return true;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

function removeUnsafeMarkdown() {
  return (tree: Root) => {
    const htmlNodes = new Set<Node>();
    visit(tree, "html", (node) => {
      htmlNodes.add(node);
    });

    type NodeWithChildren = { children?: NodeWithChildren[]; type: string; url?: string };
    const clean = (node: NodeWithChildren) => {
      if (!node.children) return;
      node.children = node.children.filter((child) => !htmlNodes.has(child as unknown as Node));
      for (const child of node.children) {
        if (child.type === "link" || child.type === "image") {
          const link = child as Link;
          if (!safeUrl(link.url)) link.url = "#";
        }
        clean(child);
      }
    };

    clean(tree as unknown as NodeWithChildren);
  };
}

/** Sanitizes persisted Markdown while retaining normal Markdown structure. */
export function sanitizeJobMarkdown(source: string): string {
  if (!source) return "";
  return String(remark().use(remarkGfm).use(removeUnsafeMarkdown).processSync(source));
}
