import { cookies } from "next/headers";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";

const SESSION_COOKIE = "__session";

export interface AdminSession {
  uid: string;
  email: string;
  role: string;
}

/**
 * Verifies that the current request is from an authenticated admin user.
 * Returns the admin session info, or null if not authorized.
 *
 * 權限來源以 Firebase Auth Custom Claims 為準（與 Firestore Rules 的 isAdmin()
 * 判斷一致），Custom Claims 只能由 Firebase Admin SDK 設定，使用者無法自行寫入。
 * Firestore 的 users/{uid}.role 僅作為第二道一致性檢查——它是使用者可直接寫入的
 * 集合，單獨信任它會讓任何人自行建立 role:"admin" 的文件即取得管理員權限。
 */
export async function verifyAdmin(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    if (!session) return null;

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(session, true);

    // 1. 權威來源：Custom Claims（不可由用戶端寫入）
    const userRecord = await adminAuth.getUser(decoded.uid);
    if (userRecord.customClaims?.role !== "admin") return null;

    // 2. 一致性檢查：Firestore 文件必須同步標記為 admin，
    //    以便管理員在後台降級某人後立即生效，不必等 token 過期。
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();
    const role = userDoc.exists ? (userDoc.data()?.role as string) : null;

    if (role !== "admin") return null;

    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
      role,
    };
  } catch {
    return null;
  }
}

/**
 * Helper to create a 401/403 JSON response for unauthorized requests.
 */
export function unauthorizedResponse(message = "未授權的操作") {
  return Response.json({ error: message }, { status: 403 });
}
