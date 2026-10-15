import GithubSlugger from "github-slugger";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Nodes, Root } from "mdast";

/** 與 render-markdown.ts 的 rehype-sanitize 預設 clobberPrefix 一致 */
const HEADING_ID_PREFIX = "user-content-";

export interface MarkdownSection {
  /** 章節標題；第一個標題之前的內容為 null */
  heading: string | null;
  depth: number;
  /** 對應頁面上標題元素的 id（已含 user-content- 前綴） */
  id: string | null;
  /** 上層標題（由淺到深），例如 [{ depth: 2, text: "第二章 會員" }] */
  ancestors: Array<{ depth: number; text: string }>;
  text: string;
}

const parser = unified().use(remarkParse).use(remarkGfm);

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** 取節點純文字（不含圖片 alt 與原始 HTML，與 rehype-slug 計算標題 id 的方式一致）。 */
function nodeText(node: Nodes): string {
  switch (node.type) {
    case "text":
    case "inlineCode":
      return node.value;
    case "code":
      return ` ${node.value} `;
    case "html":
    case "image":
    case "imageReference":
    case "definition":
    case "footnoteDefinition":
      return "";
    case "break":
      return " ";
    default:
      break;
  }

  if (!("children" in node)) return "";
  const parts = (node.children as Nodes[]).map(nodeText);
  // 段落、儲存格內是行內元素，直接串接（避免「**粗體**：」變成「粗體 ：」）；
  // 清單、表格等容器的子元素是區塊，以空白分隔。
  if (node.type === "paragraph" || node.type === "tableCell") {
    return ` ${parts.join("")} `;
  }
  const isContainer = node.type === "listItem"
    || node.type === "tableRow"
    || node.type === "blockquote"
    || node.type === "list"
    || node.type === "table";
  return isContainer ? ` ${parts.join(" ")} ` : parts.join("");
}

/** 標題原始文字（與 hast-util-to-string 相同：只串接文字節點，不補空白）。 */
function headingSlugSource(node: Nodes): string {
  if (node.type === "text" || node.type === "inlineCode") return node.value;
  if (node.type === "image" || node.type === "imageReference" || node.type === "html") return "";
  if (!("children" in node)) return "";
  return (node.children as Nodes[]).map(headingSlugSource).join("");
}

/**
 * 依標題把 Markdown 切成章節，並計算每個標題在頁面上的錨點 id。
 * 例如法規的每一條（### 第十七條（退場機制））都會成為獨立的搜尋結果。
 */
export function splitMarkdownSections(markdown: string): MarkdownSection[] {
  const tree = parser.parse(markdown ?? "") as Root;
  const slugger = new GithubSlugger();
  const sections: MarkdownSection[] = [];
  const headingStack: Array<{ depth: number; text: string }> = [];

  let current: MarkdownSection = { heading: null, depth: 0, id: null, ancestors: [], text: "" };
  const chunks: string[] = [];

  const flush = () => {
    const text = collapseWhitespace(chunks.join(" "));
    if (current.heading !== null || text) {
      sections.push({ ...current, text });
    }
    chunks.length = 0;
  };

  for (const node of tree.children) {
    if (node.type === "heading") {
      flush();
      const heading = collapseWhitespace(nodeText(node));
      // rehype-slug 對每個標題都會計算 slug（含空標題），需維持相同順序
      const slug = slugger.slug(headingSlugSource(node));
      while (headingStack.length > 0 && headingStack[headingStack.length - 1].depth >= node.depth) {
        headingStack.pop();
      }
      current = {
        heading,
        depth: node.depth,
        id: `${HEADING_ID_PREFIX}${slug}`,
        ancestors: [...headingStack],
        text: "",
      };
      headingStack.push({ depth: node.depth, text: heading });
      continue;
    }

    collectNestedHeadings(node, slugger);
    chunks.push(nodeText(node));
  }
  flush();

  return sections;
}

/** 巢狀於引言或清單內的標題也會被 rehype-slug 編號，需同步消耗 slug 計數。 */
function collectNestedHeadings(node: Nodes, slugger: GithubSlugger) {
  if (!("children" in node)) return;
  for (const child of node.children as Nodes[]) {
    if (child.type === "heading") {
      slugger.slug(headingSlugSource(child));
    }
    collectNestedHeadings(child, slugger);
  }
}

/** 整篇 Markdown 轉純文字（不分章節）。 */
export function markdownToPlainText(markdown: string): string {
  return collapseWhitespace(
    splitMarkdownSections(markdown)
      .map((section) => [section.heading ?? "", section.text].join(" "))
      .join(" "),
  );
}

const CHINESE_DIGITS: Record<string, number> = {
  零: 0, 〇: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};
const CHINESE_UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

export function chineseNumeralToNumber(value: string): number | null {
  if (!value) return null;
  let total = 0;
  let digit = 0;
  for (const ch of value) {
    if (ch in CHINESE_DIGITS) {
      digit = CHINESE_DIGITS[ch];
    } else if (ch in CHINESE_UNITS) {
      total += (digit || 1) * CHINESE_UNITS[ch];
      digit = 0;
    } else {
      return null;
    }
  }
  return total + digit;
}

/**
 * 為「第十七條」「第二章」等條號產生阿拉伯數字別名（「第17條」），
 * 讓使用者輸入任一種寫法都能找到。
 */
export function buildArticleNumberAliases(text: string): string[] {
  const aliases = new Set<string>();
  const regex = /第([零〇一二三四五六七八九十百千兩]+)(條|章|節|款|項|點)(之[零〇一二三四五六七八九十]+)?/g;
  for (const match of text.matchAll(regex)) {
    const number = chineseNumeralToNumber(match[1]);
    if (number === null) continue;
    const suffix = match[3] ? `之${chineseNumeralToNumber(match[3].slice(1)) ?? match[3].slice(1)}` : "";
    aliases.add(`第${number}${match[2]}${suffix}`);
  }
  return Array.from(aliases);
}
