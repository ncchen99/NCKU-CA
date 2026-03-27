import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { unstable_cache } from "next/cache";
import type { SiteContent } from "@/types";

const COLLECTION = "site_content";
const PUBLIC_SITE_CONTENT_REVALIDATE_SECONDS = 31_536_000;

async function querySiteContent(pageId: string): Promise<SiteContent | null> {
  const db = getAdminDb();
  const doc = await db.collection(COLLECTION).doc(pageId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as SiteContent;
}

export async function getSiteContent(
  pageId: string
): Promise<SiteContent | null> {
  try {
    return unstable_cache(
      () => querySiteContent(pageId),
      ["site-content:getSiteContent", pageId],
      {
        revalidate: PUBLIC_SITE_CONTENT_REVALIDATE_SECONDS,
        tags: ["site-content", `site-content:${pageId}`],
      },
    )();
  } catch (error) {
    throw new Error(
      `Failed to get site content "${pageId}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getAllSiteContent(): Promise<SiteContent[]> {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() }) as SiteContent
    );
  } catch (error) {
    throw new Error(
      `Failed to get all site content: ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function updateSiteContent(
  pageId: string,
  data: {
    title?: string;
    content_markdown?: string;
    metadata?: Record<string, unknown>;
  },
  updatedBy: string
): Promise<void> {
  try {
    const db = getAdminDb();
    await db
      .collection(COLLECTION)
      .doc(pageId)
      .set(
        {
          ...data,
          updated_at: FieldValue.serverTimestamp(),
          updated_by: updatedBy,
        },
        { merge: true }
      );
  } catch (error) {
    throw new Error(
      `Failed to update site content "${pageId}": ${error instanceof Error ? error.message : error}`
    );
  }
}
