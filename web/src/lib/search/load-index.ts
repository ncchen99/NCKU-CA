import { unstable_cache } from "next/cache";
import { getAdminDb } from "@/lib/firebase-admin";
import { anyTimestampToDate } from "@/lib/datetime";
import {
  buildSearchDocuments,
  SEARCH_SITE_CONTENT_IDS,
  type SearchSourceForm,
  type SearchSourcePost,
  type SearchSourceSiteContent,
} from "./build-documents";
import type { SearchIndexPayload } from "./types";

/** 後台更新文章、網站內容、表單時會以 revalidateTag 讓索引立即失效（見 lib/isr.ts） */
export const SEARCH_INDEX_CACHE_TAG = "search-index";
const SEARCH_INDEX_REVALIDATE_SECONDS = 31_536_000;

async function queryPublishedPosts(): Promise<SearchSourcePost[]> {
  const snapshot = await getAdminDb()
    .collection("posts")
    .where("status", "==", "published")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      slug: String(data.slug ?? ""),
      title: String(data.title ?? ""),
      category: String(data.category ?? ""),
      tags: Array.isArray(data.tags) ? data.tags.map((tag: unknown) => String(tag)) : [],
      content_markdown: String(data.content_markdown ?? ""),
      published_at: anyTimestampToDate(data.published_at),
    };
  });
}

async function querySiteContent(): Promise<SearchSourceSiteContent[]> {
  const db = getAdminDb();
  const refs = SEARCH_SITE_CONTENT_IDS.map((id) => db.collection("site_content").doc(id));
  const snapshots = await db.getAll(...refs);
  return snapshots
    .filter((snapshot) => snapshot.exists)
    .map((snapshot) => {
      const data = snapshot.data() ?? {};
      return {
        id: snapshot.id,
        title: typeof data.title === "string" ? data.title : undefined,
        content_markdown: typeof data.content_markdown === "string" ? data.content_markdown : undefined,
      };
    });
}

async function queryOpenForms(): Promise<SearchSourceForm[]> {
  const snapshot = await getAdminDb()
    .collection("forms")
    .where("status", "==", "open")
    .select("title", "description")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: String(data.title ?? ""),
      description: typeof data.description === "string" ? data.description : undefined,
    };
  });
}

async function buildSearchIndexPayload(): Promise<SearchIndexPayload> {
  const [posts, siteContent, forms] = await Promise.all([
    queryPublishedPosts(),
    querySiteContent(),
    queryOpenForms(),
  ]);

  return {
    version: 1,
    generated_at: new Date().toISOString(),
    documents: buildSearchDocuments({ posts, siteContent, forms }),
  };
}

/**
 * 取得全站搜尋索引。結果快取在 Next.js Data Cache，
 * 只有在後台修改內容後才會重新查詢 Firestore，不會因搜尋次數增加讀取費用。
 */
export function getSearchIndexPayload(): Promise<SearchIndexPayload> {
  return unstable_cache(buildSearchIndexPayload, ["search:index:v1"], {
    revalidate: SEARCH_INDEX_REVALIDATE_SECONDS,
    tags: [SEARCH_INDEX_CACHE_TAG],
  })();
}
