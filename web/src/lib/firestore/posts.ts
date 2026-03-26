import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { unstable_cache } from "next/cache";
import type { Post } from "@/types";

const COLLECTION = "posts";

const PUBLIC_POSTS_REVALIDATE_SECONDS = 300;

type PublishedPostOptions = {
  category?: string;
  limit?: number;
  offset?: number;
  tag?: string;
};

export const DEFAULT_PRIMARY_TAG = "其他";

export function getPrimaryPostTag(tags: unknown, fallback = DEFAULT_PRIMARY_TAG): string {
  if (!Array.isArray(tags)) return fallback;

  const first = tags
    .map((tag) => String(tag).trim())
    .find((tag) => tag.length > 0);

  return first ?? fallback;
}

function normalizePublishedPostOptions(options?: PublishedPostOptions): Required<PublishedPostOptions> {
  return {
    category: options?.category ?? "",
    limit: options?.limit ?? 0,
    offset: options?.offset ?? 0,
    tag: options?.tag ?? "",
  };
}

function buildPublishedPostTags(options: Required<PublishedPostOptions>): string[] {
  const tags = ["posts"];
  if (options.category) {
    tags.push(`posts:category:${options.category}`);
  }
  if (options.tag) {
    tags.push(`posts:tag:${options.tag}`);
  }
  return tags;
}

async function queryPostBySlug(slug: string): Promise<Post | null> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTION)
    .where("slug", "==", slug)
    .limit(1)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Post;
}

async function queryPublishedPosts(
  options?: PublishedPostOptions,
): Promise<{ posts: Post[]; total: number }> {
  const db = getAdminDb();
  const normalized = normalizePublishedPostOptions(options);

  let query = db
    .collection(COLLECTION)
    .where("status", "==", "published") as FirebaseFirestore.Query;

  if (normalized.category) {
    query = query.where("category", "==", normalized.category);
  }

  if (normalized.tag) {
    query = query.where("tags", "array-contains", normalized.tag);
  }

  const countSnapshot = await query.count().get();
  const total = countSnapshot.data().count;

  query = query.orderBy("published_at", "desc");

  if (normalized.offset > 0) {
    const offsetSnapshot = await query.limit(normalized.offset).get();
    if (!offsetSnapshot.empty) {
      const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
      query = query.startAfter(lastDoc);
    }
  }

  if (normalized.limit > 0) {
    query = query.limit(normalized.limit);
  }

  const snapshot = await query.get();
  const posts = snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() }) as Post,
  );

  return { posts, total };
}

async function queryAllPostSlugs(): Promise<string[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection(COLLECTION)
    .where("status", "==", "published")
    .select("slug")
    .get();
  return snapshot.docs.map((doc) => doc.data().slug as string);
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    return unstable_cache(
      () => queryPostBySlug(slug),
      ["posts:getPostBySlug", slug],
      {
        revalidate: PUBLIC_POSTS_REVALIDATE_SECONDS,
        tags: ["posts", `post:${slug}`],
      },
    )();
  } catch (error) {
    throw new Error(
      `Failed to get post by slug "${slug}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getPublishedPosts(
  options?: PublishedPostOptions,
): Promise<{ posts: Post[]; total: number }> {
  try {
    const normalized = normalizePublishedPostOptions(options);
    const cacheKey = JSON.stringify(normalized);
    return unstable_cache(
      () => queryPublishedPosts(normalized),
      ["posts:getPublishedPosts", cacheKey],
      {
        revalidate: PUBLIC_POSTS_REVALIDATE_SECONDS,
        tags: buildPublishedPostTags(normalized),
      },
    )();
  } catch (error) {
    throw new Error(
      `Failed to get published posts: ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getAllPosts(
  options?: { status?: string; category?: string; limit?: number; offset?: number }
): Promise<{ posts: Post[]; total: number }> {
  try {
    const db = getAdminDb();
    let query = db.collection(COLLECTION) as FirebaseFirestore.Query;

    if (options?.status) {
      query = query.where("status", "==", options.status);
    }
    if (options?.category) {
      query = query.where("category", "==", options.category);
    }

    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    query = query.orderBy("published_at", "desc");

    if (options?.offset) {
      const baseQuery = db.collection(COLLECTION) as FirebaseFirestore.Query;
      let offsetQuery = baseQuery;
      if (options?.status) offsetQuery = offsetQuery.where("status", "==", options.status);
      if (options?.category) offsetQuery = offsetQuery.where("category", "==", options.category);
      offsetQuery = offsetQuery.orderBy("published_at", "desc").limit(options.offset);

      const offsetSnapshot = await offsetQuery.get();
      if (!offsetSnapshot.empty) {
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const snapshot = await query.get();
    const posts = snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as Post
    );
    return { posts, total };
  } catch (error) {
    throw new Error(
      `Failed to get all posts: ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getPostById(id: string): Promise<Post | null> {
  try {
    const db = getAdminDb();
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as Post;
  } catch (error) {
    throw new Error(
      `Failed to get post "${id}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function createPost(
  data: Omit<Post, "id" | "published_at" | "updated_at">
): Promise<string> {
  try {
    const db = getAdminDb();
    const docRef = await db.collection(COLLECTION).add({
      ...data,
      published_at: data.status === "published" ? FieldValue.serverTimestamp() : null,
      updated_at: FieldValue.serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    throw new Error(
      `Failed to create post: ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function updatePost(
  id: string,
  data: Partial<Post>
): Promise<void> {
  try {
    const db = getAdminDb();
    const updateData: Partial<Post> = { ...data };
    delete updateData.id;
    const updatePayload: Omit<Partial<Post>, "published_at"> & {
      published_at?: Post["published_at"] | FirebaseFirestore.FieldValue;
    } = { ...updateData };

    // 如果狀態設為「已發布」，且文章原本沒有發布時間，則補上發布時間
    if (updateData.status === "published") {
      const doc = await db.collection(COLLECTION).doc(id).get();
      const existingData = doc.data();
      if (!existingData?.published_at) {
        updatePayload.published_at = FieldValue.serverTimestamp();
      }
    }

    await db
      .collection(COLLECTION)
      .doc(id)
      .update({
        ...updatePayload,
        updated_at: FieldValue.serverTimestamp(),
      });
  } catch (error) {
    throw new Error(
      `Failed to update post "${id}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function deletePost(id: string): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection(COLLECTION).doc(id).delete();
  } catch (error) {
    throw new Error(
      `Failed to delete post "${id}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getAllPostSlugs(): Promise<string[]> {
  try {
    return unstable_cache(
      () => queryAllPostSlugs(),
      ["posts:getAllPostSlugs"],
      {
        revalidate: PUBLIC_POSTS_REVALIDATE_SECONDS,
        tags: ["posts"],
      },
    )();
  } catch (error) {
    throw new Error(
      `Failed to get all post slugs: ${error instanceof Error ? error.message : error}`
    );
  }
}

/**
 * 聚合所有文章的標籤使用次數（依 posts.tags 陣列）。
 * 每篇文章至少 1 次 Firestore 讀取；文章量大時可改為維護 tag_stats 集合以降低讀取成本。
 */
export async function getPostTagAggregates(): Promise<
  { tag: string; count: number }[]
> {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(COLLECTION).select("tags").get();
    const counts = new Map<string, number>();
    for (const doc of snapshot.docs) {
      const tags = doc.data().tags as string[] | undefined;
      if (!Array.isArray(tags)) continue;
      for (const raw of tags) {
        const t = String(raw).trim();
        if (!t) continue;
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) =>
        b.count !== a.count
          ? b.count - a.count
          : a.tag.localeCompare(b.tag, "zh-Hant"),
      );
  } catch (error) {
    throw new Error(
      `Failed to aggregate post tags: ${error instanceof Error ? error.message : error}`
    );
  }
}
