import GithubSlugger from "github-slugger";

export interface MarkdownTocItem {
  depth: 2 | 3;
  text: string;
  id: string;
}

/**
 * 從 Markdown 擷取二、三級標題作為目錄（與 rehype-slug 預設規則對齊）。
 * 標題請盡量使用純文字；含內嵌格式時以行首 `##` 行為準。
 */
export function extractMarkdownToc(markdown: string): MarkdownTocItem[] {
  const slugger = new GithubSlugger();
  const items: MarkdownTocItem[] = [];
  const lines = markdown.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    const m = /^(#{2,3})\s+(.+)$/.exec(trimmed);
    if (!m) continue;
    const depth = m[1].length as 2 | 3;
    if (depth !== 2 && depth !== 3) continue;
    const raw = m[2].trim();
    const text = raw.replace(/\s+#+\s*$/, "").trim();
    if (!text) continue;
    const id = slugger.slug(text);
    items.push({ depth, text, id });
  }

  return items;
}
