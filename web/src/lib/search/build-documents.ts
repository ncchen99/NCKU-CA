import { CHARTER_DOCUMENTS } from "@/lib/charter-documents";
import {
  buildArticleNumberAliases,
  collapseWhitespace,
  splitMarkdownSections,
  type MarkdownSection,
} from "./markdown-sections";
import { normalizeForSearch } from "./normalize";
import type { SearchDocType, SearchDocument } from "./types";

export interface SearchSourcePost {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  content_markdown: string;
  published_at: Date | null;
}

export interface SearchSourceSiteContent {
  id: string;
  title?: string;
  content_markdown?: string;
}

export interface SearchSourceForm {
  id: string;
  title: string;
  description?: string;
}

export interface SearchSources {
  posts: SearchSourcePost[];
  siteContent: SearchSourceSiteContent[];
  forms: SearchSourceForm[];
}

/** 單篇文章內文上限，避免異常長文讓索引過大 */
const MAX_POST_TEXT_LENGTH = 10_000;
const BREADCRUMB_SEPARATOR = " › ";
const ARTICLE_HEADING_REGEX = /^第[\d零〇一二三四五六七八九十百千兩]+條/;
const CHAPTER_HEADING_REGEX = /^第[\d零〇一二三四五六七八九十百千兩]+[編章節]/;

const POST_CATEGORY_CONFIG: Record<string, { type: SearchDocType; basePath: string }> = {
  news: { type: "news", basePath: "/news" },
  activity_review: { type: "activity", basePath: "/activities" },
};

interface StaticPage {
  id: string;
  title: string;
  url: string;
  text: string;
  keywords: string;
  /** 對應 site_content 文件 ID；有 CMS 內容時會再依章節建立索引 */
  siteContentId?: string;
}

const STATIC_PAGES: StaticPage[] = [
  {
    id: "about",
    title: "關於我們",
    url: "/about",
    text: "認識國立成功大學社團聯合會（NCA）——成大最高社團自治組織，致力於社團交流、資源整合與校園文化推動。",
    keywords: "社聯會 NCA 組織介紹 成立宗旨 核心業務 社團博覽會 代表大會 社團評鑑 經費補助 場地協調 幹部培訓",
    siteContentId: "about",
  },
  {
    id: "members",
    title: "幹部成員",
    url: "/members",
    text: "國立成功大學社團聯合會現任幹部成員介紹，包含會長、副會長及各部門部長。",
    keywords: "幹部 會長 副會長 部長 副部長 組織架構 團隊",
    siteContentId: "members",
  },
  {
    id: "news",
    title: "最新消息",
    url: "/news",
    text: "社聯會最新公告、會議通知與報名資訊。",
    keywords: "公告 消息 新聞 通知",
  },
  {
    id: "activities",
    title: "活動回顧",
    url: "/activities",
    text: "社聯會歷次活動紀錄與成果回顧。",
    keywords: "活動 回顧 紀錄 成果",
  },
  {
    id: "attendance",
    title: "活動簽到",
    url: "/attendance",
    text: "社團代表於活動現場輸入點名密碼完成簽到。",
    keywords: "點名 簽到 出席 點名密碼",
  },
  {
    id: "profile",
    title: "個人資料",
    url: "/profile",
    text: "編輯個人資料、所屬社團、職稱與系級。",
    keywords: "帳號 設定 社團 職稱 系級",
  },
  {
    id: "profile-attendance",
    title: "點名記錄",
    url: "/profile/attendance",
    text: "查看所屬社團的活動點名與出席紀錄。",
    keywords: "出席紀錄 簽到紀錄 點名紀錄",
  },
  {
    id: "profile-forms",
    title: "表單記錄",
    url: "/profile/forms",
    text: "查看與編輯已送出的表單回覆。",
    keywords: "填答紀錄 報名紀錄 表單回覆",
  },
];

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Taipei",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toDateString(date: Date | null): string | undefined {
  if (!date || Number.isNaN(date.getTime())) return undefined;
  return dateFormatter.format(date);
}

function anchorUrl(path: string, id: string | null): string {
  return id ? `${path}#${encodeURIComponent(id)}` : path;
}

function sectionsToText(sections: MarkdownSection[], skipLeadingTitle?: string): string {
  const normalizedTitle = skipLeadingTitle ? normalizeForSearch(collapseWhitespace(skipLeadingTitle)) : "";
  return collapseWhitespace(
    sections
      .map((section, index) => {
        const isDuplicateTitle = index === 0
          && section.depth === 1
          && section.heading !== null
          && normalizeForSearch(section.heading) === normalizedTitle;
        const heading = isDuplicateTitle ? "" : section.heading ?? "";
        return `${heading} ${section.text}`;
      })
      .join(" "),
  );
}

function buildPostDocuments(posts: SearchSourcePost[]): SearchDocument[] {
  const documents: SearchDocument[] = [];
  for (const post of posts) {
    const config = POST_CATEGORY_CONFIG[post.category];
    if (!config || !post.slug || !post.title) continue;
    const sections = splitMarkdownSections(post.content_markdown ?? "");
    documents.push({
      id: `post:${post.id}`,
      type: config.type,
      title: post.title.trim(),
      url: `${config.basePath}/${post.slug}`,
      text: sectionsToText(sections, post.title).slice(0, MAX_POST_TEXT_LENGTH),
      tags: post.tags.map((tag) => tag.trim()).filter(Boolean),
      date: toDateString(post.published_at),
    });
  }
  return documents;
}

/**
 * 長篇頁面（法規、關於我們）依標題拆成多筆，每一條條文都能直接連到頁面上的段落。
 */
function buildSectionedDocuments(params: {
  idPrefix: string;
  type: SearchDocType;
  path: string;
  title: string;
  intro: string;
  keywords?: string;
  markdown: string;
}): SearchDocument[] {
  const { idPrefix, type, path, title, intro, keywords, markdown } = params;
  const sections = splitMarkdownSections(markdown);
  const documents: SearchDocument[] = [];

  const leading = sections.filter((section) => section.heading === null || section.depth === 1);
  const leadingText = collapseWhitespace([intro, ...leading.map((section) => section.text)].join(" "));
  documents.push({
    id: idPrefix,
    type,
    title,
    url: path,
    text: leadingText,
    keywords,
  });

  for (const section of sections) {
    if (section.heading === null || section.depth === 1 || !section.heading) continue;
    // 一級標題通常就是文件名稱，麵包屑以頁面標題取代。
    // 條文只掛在「第X章／節」底下；部分法規的條文緊接在「修正沿革」之後，不應把它當成所屬章節。
    const isArticle = ARTICLE_HEADING_REGEX.test(section.heading);
    const ancestors = section.ancestors
      .filter((ancestor) => ancestor.depth > 1)
      .filter((ancestor) => !isArticle || CHAPTER_HEADING_REGEX.test(ancestor.text))
      .map((ancestor) => ancestor.text);
    const parent = [title, ...ancestors].join(BREADCRUMB_SEPARATOR);
    const aliases = buildArticleNumberAliases(section.heading);
    documents.push({
      id: `${idPrefix}#${section.id}`,
      type,
      title: section.heading,
      url: anchorUrl(path, section.id),
      text: section.text,
      parent,
      keywords: aliases.length > 0 ? aliases.join(" ") : undefined,
    });
  }

  return documents;
}

function buildCharterDocuments(siteContent: Map<string, SearchSourceSiteContent>): SearchDocument[] {
  return CHARTER_DOCUMENTS.flatMap((charter) => {
    const content = siteContent.get(charter.slug);
    const title = content?.title?.trim() || charter.title;
    return buildSectionedDocuments({
      idPrefix: `charter:${charter.slug}`,
      type: "charter",
      path: `/charter/${charter.slug}`,
      title,
      intro: charter.description,
      keywords: "法規 辦法 章程 規則",
      markdown: content?.content_markdown ?? "",
    });
  });
}

function buildStaticPageDocuments(siteContent: Map<string, SearchSourceSiteContent>): SearchDocument[] {
  return STATIC_PAGES.flatMap((page) => {
    const content = page.siteContentId ? siteContent.get(page.siteContentId) : undefined;
    return buildSectionedDocuments({
      idPrefix: `page:${page.id}`,
      type: "page",
      path: page.url,
      title: page.title,
      intro: page.text,
      keywords: page.keywords,
      markdown: content?.content_markdown ?? "",
    });
  });
}

function buildFormDocuments(forms: SearchSourceForm[]): SearchDocument[] {
  return forms
    .filter((form) => form.id && form.title)
    .map((form) => ({
      id: `form:${form.id}`,
      type: "form" as const,
      title: form.title.trim(),
      url: `/forms/${encodeURIComponent(form.id)}`,
      text: collapseWhitespace(form.description ?? ""),
      keywords: "表單 報名 填寫",
    }));
}

export function buildSearchDocuments(sources: SearchSources): SearchDocument[] {
  const siteContent = new Map(sources.siteContent.map((content) => [content.id, content]));
  return [
    ...buildPostDocuments(sources.posts),
    ...buildCharterDocuments(siteContent),
    ...buildStaticPageDocuments(siteContent),
    ...buildFormDocuments(sources.forms),
  ];
}

export const SEARCH_SITE_CONTENT_IDS = [
  ...CHARTER_DOCUMENTS.map((doc) => doc.slug),
  ...STATIC_PAGES.flatMap((page) => (page.siteContentId ? [page.siteContentId] : [])),
];
