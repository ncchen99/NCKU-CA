import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { Post } from "@/types";

const COLLECTION = "posts";

export async function getPostBySlug(slug: string): Promise<Post | null> {
  try {
    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTION)
      .where("slug", "==", slug)
      .limit(1)
      .get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Post;
  } catch (error) {
    throw new Error(
      `Failed to get post by slug "${slug}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getPublishedPosts(
  options?: { category?: string; limit?: number; offset?: number }
): Promise<{ posts: Post[]; total: number }> {
  try {
    const db = getAdminDb();
    let query = db
      .collection(COLLECTION)
      .where("status", "==", "published") as FirebaseFirestore.Query;

    if (options?.category) {
      query = query.where("category", "==", options.category);
    }

    const countSnapshot = await query.count().get();
    const total = countSnapshot.data().count;

    query = query.orderBy("published_at", "desc");

    if (options?.offset) {
      const offsetSnapshot = await db
        .collection(COLLECTION)
        .where("status", "==", "published")
        .orderBy("published_at", "desc")
        .limit(options.offset)
        .get();
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
    const { id: _id, ...updateData } = data;
    await db
      .collection(COLLECTION)
      .doc(id)
      .update({
        ...updateData,
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
    const db = getAdminDb();
    const snapshot = await db
      .collection(COLLECTION)
      .where("status", "==", "published")
      .select("slug")
      .get();
    return snapshot.docs.map((doc) => doc.data().slug as string);
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
