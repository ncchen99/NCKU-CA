"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User as FirebaseUser } from "firebase/auth";
import type { User } from "@/types";

const ALLOWED_EMAIL_SUFFIX = "@gs.ncku.edu.tw";

interface AuthContextValue {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  /** 從 Firestore 重新載入使用者文件（例如更新個人資料後） */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchUserData(uid: string): Promise<User | null> {
  const { getClientDb } = await import("@/lib/firebase");
  const { doc, getDoc } = await import("firebase/firestore");
  const db = await getClientDb();
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as User;
}

async function createSession(idToken: string) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "建立 session 失敗");
  }
  return res.json();
}

async function deleteSession() {
  await fetch("/api/auth/session", { method: "DELETE" });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function initAuth() {
      const { getClientAuth } = await import("@/lib/firebase");
      const { onAuthStateChanged, signOut: firebaseSignOut } = await import(
        "firebase/auth"
      );
      const clientAuth = await getClientAuth();

      unsubscribe = onAuthStateChanged(clientAuth, async (fbUser) => {
        try {
          if (!fbUser) {
            setFirebaseUser(null);
            setUser(null);
            return;
          }

          if (!fbUser.email?.endsWith(ALLOWED_EMAIL_SUFFIX)) {
            await firebaseSignOut(clientAuth);
            await deleteSession();
            setFirebaseUser(null);
            setUser(null);
            return;
          }

          setFirebaseUser(fbUser);
          const userData = await fetchUserData(fbUser.uid);
          setUser(userData);
        } catch (err) {
          console.error("Auth state change error:", err);
          setFirebaseUser(null);
          setUser(null);
        } finally {
          setLoading(false);
        }
      });
    }

    initAuth();

    return () => {
      unsubscribe?.();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const { getClientAuth } = await import("@/lib/firebase");
    const {
      GoogleAuthProvider,
      signInWithPopup,
      signOut: firebaseSignOut,
    } = await import("firebase/auth");
    const clientAuth = await getClientAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: "gs.ncku.edu.tw" });

    const result = await signInWithPopup(clientAuth, provider);
    const fbUser = result.user;

    if (!fbUser.email?.endsWith(ALLOWED_EMAIL_SUFFIX)) {
      await firebaseSignOut(clientAuth);
      throw new Error("僅限使用 @gs.ncku.edu.tw 信箱登入");
    }

    const idToken = await fbUser.getIdToken();
    await createSession(idToken);

    const userData = await fetchUserData(fbUser.uid);
    setFirebaseUser(fbUser);
    setUser(userData);
  }, []);

  const signOut = useCallback(async () => {
    const { getClientAuth } = await import("@/lib/firebase");
    const { signOut: firebaseSignOut } = await import("firebase/auth");
    const clientAuth = await getClientAuth();
    await firebaseSignOut(clientAuth);
    await deleteSession();
    setFirebaseUser(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { getClientAuth } = await import("@/lib/firebase");
    const clientAuth = await getClientAuth();
    const fbUser = clientAuth.currentUser;
    if (!fbUser) return;
    const userData = await fetchUserData(fbUser.uid);
    setUser(userData);
  }, []);

  return (
    <AuthContext
      value={{
        user,
        firebaseUser,
        loading,
        signInWithGoogle,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
