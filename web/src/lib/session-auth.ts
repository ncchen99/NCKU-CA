import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin";

const SESSION_COOKIE = "__session";

export interface UserSession {
  uid: string;
  email: string;
}

/**
 * 驗證一般登入使用者（含 admin），僅依 session cookie。
 */
export async function verifyUserSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    if (!session) return null;

    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifySessionCookie(session, true);

    return {
      uid: decoded.uid,
      email: decoded.email ?? "",
    };
  } catch {
    return null;
  }
}
