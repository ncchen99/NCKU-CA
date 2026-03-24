"use client";

import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/layout/public-layout";
import { ClubCategoryPicker } from "@/components/public/club-category-picker";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";

type ProfileUser = {
  display_name: string;
  club_id: string;
  position_title?: string;
  department_grade?: string;
  profile_completed?: boolean;
  club_name?: string;
  club_category?: string;
};

export default function ProfilePage() {
  const { firebaseUser, loading: authLoading, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [clubId, setClubId] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [departmentGrade, setDepartmentGrade] = useState("");
  const [defaultCategoryName, setDefaultCategoryName] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    fetch("/api/auth/profile")
      .then((r) => r.json())
      .then((d: { user?: ProfileUser | null; error?: string }) => {
        if (cancelled) return;
        const u = d.user;
        if (u) {
          setDisplayName(u.display_name ?? "");
          setClubId(u.club_id ?? "");
          setPositionTitle(u.position_title ?? "");
          setDepartmentGrade(u.department_grade ?? "");
          setDefaultCategoryName(u.club_category);
        } else {
          setDisplayName(firebaseUser.displayName ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) setError("無法載入個人資料");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, firebaseUser]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          club_id: clubId,
          position_title: positionTitle || undefined,
          department_grade: departmentGrade || undefined,
          profile_completed: true,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "儲存失敗");
        return;
      }
      setSuccess(true);
      await refreshUser();
    } catch {
      setError("網路錯誤，請稍後再試。");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-xl px-6 pt-32 pb-24">
          <div className="h-40 animate-pulse rounded-xl bg-neutral-100" />
        </div>
      </PublicLayout>
    );
  }

  if (!firebaseUser) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-xl px-6 pt-32 pb-24 text-center">
          <p className="text-[15px] text-neutral-600">請先登入以設定個人資料。</p>
          <Link
            href="/login"
            className="mt-4 inline-block text-[14px] font-medium text-primary underline"
          >
            前往登入
          </Link>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="w-full">
        <div className="mx-auto max-w-xl px-6 pt-24 pb-20">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-950">
            個人資料
          </h1>
          <p className="mt-2 text-[14px] text-neutral-500">
            以下資訊可用於點名、報名等表單自動帶入；送出後仍可隨時修改。
          </p>

          <form
            className="mt-8 flex flex-col gap-6 rounded-xl border border-border bg-white p-6 shadow-sm"
            onSubmit={handleSubmit}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700">姓名</span>
              <input
                required
                className="h-10 rounded-lg border border-border px-3 text-[13px] outline-none ring-primary/0 focus:ring-2 focus:ring-primary/30"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="請輸入姓名"
              />
            </label>

            <div>
              <p className="mb-2 text-[13px] font-medium text-neutral-700">所屬社團</p>
              <ClubCategoryPicker
                valueClubId={clubId}
                onChangeClubId={setClubId}
                defaultCategoryName={defaultCategoryName}
                disabled={saving}
              />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700">
                職位（幹部名稱）
              </span>
              <input
                className="h-10 rounded-lg border border-border px-3 text-[13px] outline-none ring-primary/0 focus:ring-2 focus:ring-primary/30"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder="例：活動部副部長"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700">
                系級（選填，例：會計 116）
              </span>
              <input
                className="h-10 rounded-lg border border-border px-3 text-[13px] outline-none ring-primary/0 focus:ring-2 focus:ring-primary/30"
                value={departmentGrade}
                onChange={(e) => setDepartmentGrade(e.target.value)}
                placeholder="請輸入系所與年級"
              />
            </label>

            {error ? (
              <p className="text-[13px] text-red-600">{error}</p>
            ) : null}
            {success ? (
              <p className="text-[13px] text-emerald-700">已儲存。</p>
            ) : null}

            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? "儲存中…" : "儲存"}
            </Button>
          </form>

          <div className="mt-10 flex justify-center">
            <Link
              href="/"
              className="group inline-flex items-center gap-1 text-sm font-[450] text-neutral-500 transition-colors hover:text-primary"
            >
              <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              返回首頁
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
