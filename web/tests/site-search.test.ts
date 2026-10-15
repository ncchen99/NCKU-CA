import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdownToHtml } from "../src/lib/render-markdown";
import { normalizeForSearch } from "../src/lib/search/normalize";
import { parseSearchQuery, prepareSearchIndex, searchIndex } from "../src/lib/search/engine";
import {
  buildArticleNumberAliases,
  chineseNumeralToNumber,
  splitMarkdownSections,
} from "../src/lib/search/markdown-sections";
import { buildSearchDocuments } from "../src/lib/search/build-documents";
import type { SearchDocument } from "../src/lib/search/types";

const CHARTER_MARKDOWN = `# 國立成功大學學生社團聯合會組織章程

## 修正沿革

- 99.01.09 主席團會議通過

## 第二章 會員

### 第十七條（退場機制）

會員有下列情形之一者，由主席團會議提出**退場**提案。

### 第十七條之一（活動中心會員失格）

違反臺南市與活動中心規定情節重大者。

## 第二章 會員

重複標題測試。
`;

const ELECTION_MARKDOWN = `# 選舉罷免辦法

## 修正沿革

- 99.01.29 公告施行

### 第五條（正副會長之罷免）

會長、副會長之罷免由本會會員三分之一以上連署。
`;

const DEPOSIT_POST = {
  id: "post-1",
  slug: "deposit-refund",
  title: "社團博覽會保證金退還公告",
  category: "news",
  tags: ["社博", "保證金"],
  content_markdown: "# 社團博覽會保證金退還公告\n\n本次**社博**保證金將於社代大會後退還，請攜帶收據。",
  published_at: new Date("2026-03-01T04:00:00Z"),
};

function buildFixtureDocuments(): SearchDocument[] {
  return buildSearchDocuments({
    posts: [
      DEPOSIT_POST,
      {
        id: "post-2",
        slug: "winter-venue",
        title: "寒假場地協調會",
        category: "activity_review",
        tags: ["場地協調"],
        content_markdown: "寒假場協已完成，感謝各社團出席。",
        published_at: new Date("2025-11-20T04:00:00Z"),
      },
      {
        id: "post-3",
        slug: "unknown",
        title: "不應出現",
        category: "unknown_category",
        tags: [],
        content_markdown: "保證金",
        published_at: null,
      },
    ],
    siteContent: [
      { id: "charter", content_markdown: CHARTER_MARKDOWN },
      { id: "election-rules", content_markdown: ELECTION_MARKDOWN },
    ],
    forms: [{ id: "form-1", title: "社團博覽會報名表", description: "社博攤位報名" }],
  });
}

test("normalizeForSearch folds width, case and Traditional/Simplified variants without changing length", () => {
  const samples = ["ＮＣＡ社聯會", "臺南選舉罷免", "裡外著作", "保證金退還（第十七條）"];
  for (const sample of samples) {
    assert.equal(normalizeForSearch(sample).length, sample.length);
  }
  assert.equal(normalizeForSearch("ＮＣＡ"), "nca");
  assert.equal(normalizeForSearch("選舉"), normalizeForSearch("选举"));
  assert.equal(normalizeForSearch("臺南"), normalizeForSearch("台南"));
  assert.equal(normalizeForSearch("裡"), normalizeForSearch("裏"));
  assert.equal(normalizeForSearch(normalizeForSearch("選舉罷免")), normalizeForSearch("選舉罷免"));
});

test("parseSearchQuery segments Chinese, keeps abbreviations and drops filler words", () => {
  assert.deepEqual(parseSearchQuery("保證金退還").terms, ["保证金", "退还"]);
  assert.deepEqual(parseSearchQuery("社博").terms, ["社博"]);
  assert.deepEqual(parseSearchQuery("第十七條").terms, ["第十七条"]);
  assert.deepEqual(parseSearchQuery("請問保證金怎麼退").terms, ["保证金", "退"]);
  assert.deepEqual(parseSearchQuery("  ").terms, []);
  assert.deepEqual(parseSearchQuery("罷免，會長").phrases.length, 2);
});

test("article numbers get Arabic-numeral aliases", () => {
  assert.equal(chineseNumeralToNumber("十七"), 17);
  assert.equal(chineseNumeralToNumber("二十三"), 23);
  assert.equal(chineseNumeralToNumber("一百零五"), 105);
  assert.deepEqual(buildArticleNumberAliases("第十七條之一（活動中心會員失格）"), ["第17條之1"]);
  assert.deepEqual(buildArticleNumberAliases("第二章 會員"), ["第2章"]);
});

test("section anchors match the heading ids rendered on the page", async () => {
  const html = await renderMarkdownToHtml(CHARTER_MARKDOWN);
  const renderedIds = [...html.matchAll(/<h[1-6] id="([^"]+)"/g)].map((match) => match[1]);
  const sectionIds = splitMarkdownSections(CHARTER_MARKDOWN)
    .map((section) => section.id)
    .filter((id): id is string => Boolean(id));
  assert.deepEqual(sectionIds, renderedIds);
  assert.ok(sectionIds.includes("user-content-第二章-會員-1"));
});

test("buildSearchDocuments splits charter articles with breadcrumbs and deep links", () => {
  const documents = buildFixtureDocuments();
  const article = documents.find((doc) => doc.title === "第十七條（退場機制）");
  assert.ok(article);
  assert.equal(article.type, "charter");
  assert.equal(article.parent, "組織章程 › 第二章 會員");
  assert.equal(article.url, `/charter/charter#${encodeURIComponent("user-content-第十七條退場機制")}`);
  assert.equal(article.keywords, "第17條");

  // 條文緊接在「修正沿革」之後時，不應顯示成所屬章節
  const electionArticle = documents.find((doc) => doc.title === "第五條（正副會長之罷免）");
  assert.equal(electionArticle?.parent, "選舉罷免辦法");

  assert.ok(documents.some((doc) => doc.url === "/charter/deposit-rules"), "charter docs without CMS content stay searchable");
  assert.ok(!documents.some((doc) => doc.title === "不應出現"));

  const post = documents.find((doc) => doc.id === "post:post-1");
  assert.equal(post?.url, "/news/deposit-refund");
  assert.equal(post?.date, "2026-03-01");
  assert.ok(!post?.text.startsWith("社團博覽會保證金退還公告"), "leading h1 duplicating the title is dropped");
  assert.ok(post?.text.includes("本次社博保證金"), "inline formatting does not add spaces");
});

test("searchIndex finds Traditional content with Simplified, full-width and numeral variants", () => {
  const index = prepareSearchIndex(buildFixtureDocuments());
  const now = Date.parse("2026-03-10T00:00:00Z");

  const deposit = searchIndex(index, "保證金退還", { now });
  assert.equal(deposit.partial, false);
  assert.equal(deposit.hits[0]?.document.id, "post:post-1");

  assert.equal(searchIndex(index, "保证金退还", { now }).hits[0]?.document.id, "post:post-1");
  assert.equal(searchIndex(index, "退場", { now }).hits[0]?.document.title, "第十七條（退場機制）");
  assert.equal(searchIndex(index, "第17條", { now }).hits[0]?.document.title, "第十七條（退場機制）");
  assert.equal(searchIndex(index, "台南", { now }).hits[0]?.document.title, "第十七條之一（活動中心會員失格）");
  assert.ok(searchIndex(index, "罷免 會長", { now }).hits.some((hit) => hit.document.title === "第五條（正副會長之罷免）"));
  assert.equal(searchIndex(index, "", { now }).hits.length, 0);
});

test("search highlights point at the original (unnormalized) text", () => {
  const index = prepareSearchIndex(buildFixtureDocuments());
  const hit = searchIndex(index, "保证金", { now: Date.parse("2026-03-10T00:00:00Z") }).hits[0];
  assert.ok(hit?.snippet);
  const highlighted = hit.snippet.ranges.map(([start, end]) => hit.snippet!.text.slice(start, end));
  assert.ok(highlighted.length > 0);
  assert.ok(highlighted.every((text) => text === "保證金"));
  const titleHighlights = hit.titleRanges.map(([start, end]) => hit.document.title.slice(start, end));
  assert.deepEqual(titleHighlights, ["保證金"]);
});

test("falls back to partial matches when no document contains every term", () => {
  const index = prepareSearchIndex(buildFixtureDocuments());
  const result = searchIndex(index, "保證金收據遺失", { now: Date.parse("2026-03-10T00:00:00Z") });
  assert.equal(result.partial, true);
  assert.equal(result.hits[0]?.document.id, "post:post-1");
  assert.equal(searchIndex(index, "完全不存在的詞彙xyz").hits.length, 0);
});
