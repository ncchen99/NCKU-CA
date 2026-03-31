import { extractMarkdownToc } from "@/lib/extract-markdown-toc";
import { renderMarkdownToHtml } from "@/lib/render-markdown";
import { CmsMarkdownWithTocClient } from "@/components/public/cms-markdown-with-toc-client";

interface CmsMarkdownWithTocProps {
  markdown: string;
}

function extractHeadingIdsFromHtml(html: string): string[] {
  const ids: string[] = [];
  const headingRegex = /<h([23])\b[^>]*\sid="([^"]+)"[^>]*>/gi;

  for (const match of html.matchAll(headingRegex)) {
    const id = match[2]?.trim();
    if (id) ids.push(id);
  }

  return ids;
}

export async function CmsMarkdownWithToc({ markdown }: CmsMarkdownWithTocProps) {
  const [html, markdownToc] = await Promise.all([
    renderMarkdownToHtml(markdown),
    Promise.resolve(extractMarkdownToc(markdown)),
  ]);

  const headingIds = extractHeadingIdsFromHtml(html);
  const toc = markdownToc.map((item, index) => ({
    ...item,
    id: headingIds[index] ?? item.id,
  }));

  return <CmsMarkdownWithTocClient html={html} toc={toc} />;
}
