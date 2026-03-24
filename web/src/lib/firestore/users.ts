import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import type { User } from "@/types";

const COLLECTION = "users";

export async function getUser(uid: string): Promise<User | null> {
  try {
    const db = getAdminDb();
    const doc = await db.collection(COLLECTION).doc(uid).get();
    if (!doc.exists) return null;
    return { uid: doc.id, ...doc.data() } as User;
  } catch (error) {
    throw new Error(
      `Failed to get user "${uid}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function getAllUsers(
  options?: { role?: string }
): Promise<User[]> {
  try {
    const db = getAdminDb();
    let query = db.collection(COLLECTION) as FirebaseFirestore.Query;

    if (options?.role) {
      query = query.where("role", "==", options.role);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(
      (doc) => ({ uid: doc.id, ...doc.data() }) as User
    );
  } catch (error) {
    throw new Error(
      `Failed to get all users: ${error instanceof Error ? error.message : error}`
    );
  }
}

/** Firestore `in` 查詢每批最多 30 筆，依 uid（文件 ID）批次讀取。 */
export async function getUsersByIds(uids: string[]): Promise<User[]> {
  const unique = [...new Set(uids.filter(Boolean))];
  if (unique.length === 0) return [];

  try {
    const db = getAdminDb();
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 30) {
      chunks.push(unique.slice(i, i + 30));
    }

    const results: User[] = [];
    for (const chunk of chunks) {
      const snapshot = await db
        .collection(COLLECTION)
        .where("__name__", "in", chunk)
        .get();
      results.push(
        ...snapshot.docs.map(
          (doc) => ({ uid: doc.id, ...doc.data() }) as User
        )
      );
    }
    return results;
  } catch (error) {
    throw new Error(
      `Failed to get users by IDs: ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function createOrUpdateUser(
  uid: string,
  data: Partial<User>
): Promise<void> {
  try {
    const db = getAdminDb();
    const { uid: _uid, ...userData } = data;
    const docRef = db.collection(COLLECTION).doc(uid);
    const existing = await docRef.get();

    if (existing.exists) {
      await docRef.update(userData);
    } else {
      await docRef.set({
        ...userData,
        created_at: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    throw new Error(
      `Failed to create/update user "${uid}": ${error instanceof Error ? error.message : error}`
    );
  }
}

export async function updateUserRole(
  uid: string,
  role: "admin" | "club_member"
): Promise<void> {
  try {
    const db = getAdminDb();
    await db.collection(COLLECTION).doc(uid).update({ role });
  } catch (error) {
    throw new Error(
      `Failed to update role for user "${uid}": ${error instanceof Error ? error.message : error}`
    );
  }
}
