"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * 未完成個人資料時導向 /profile（首次登入與未勾選完成者）。
 */
export function ProfileCompletionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, firebaseUser, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) return;
    if (pathname.startsWith("/admin")) return;
    if (pathname.startsWith("/login")) return;
    if (pathname.startsWith("/profile")) return;

    const incomplete = (() => {
      if (!user) return true;
      if (user.profile_completed === false) return true;
      if (user.profile_completed === true) return false;
      const hasBasics = Boolean(
        user.display_name?.trim() && user.club_id?.trim(),
      );
      return !hasBasics;
    })();

    if (incomplete) {
      router.replace("/profile");
    }
  }, [loading, user, firebaseUser, pathname, router]);

  return <>{children}</>;
}
