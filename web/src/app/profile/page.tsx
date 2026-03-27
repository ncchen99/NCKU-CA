"use client";

import { useEffect, useState } from "react";
import { PublicLayout } from "@/components/layout/public-layout";
import { useAuth } from "@/lib/auth-context";
import { createLoginHref } from "@/lib/login-redirect";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";
import { ClubSearchSelect } from "@/components/shared/club-search-select";
import { usePathname } from "next/navigation";
import { getActiveClubs, getProfileUser, saveProfileUser } from "@/lib/client-firestore";
import { useTranslations } from "next-intl";

export default function ProfilePage() {
  const t = useTranslations("profilePage");
  const { firebaseUser, loading: authLoading, refreshUser } = useAuth();
  const pathname = usePathname();
  const loginHref = createLoginHref(pathname);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [clubId, setClubId] = useState("");
  const [clubName, setClubName] = useState("");
  const [positionTitle, setPositionTitle] = useState("");
  const [departmentGrade, setDepartmentGrade] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!firebaseUser) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getProfileUser(firebaseUser.uid)
      .then((u) => {
        if (cancelled) return;
        if (u) {
          setDisplayName(u.display_name ?? "");
          setClubId(u.club_id ?? "");
          setClubName(u.club_name ?? "");
          setPositionTitle(u.position_title ?? "");
          setDepartmentGrade(u.department_grade ?? "");
        } else {
          setDisplayName(firebaseUser.displayName ?? "");
        }
      })
      .catch(() => {
        if (!cancelled) setError(t("error.loadFailed"));
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
    const user = firebaseUser;
    try {
      if (!user) {
        setError(t("error.loginFirst"));
        return;
      }

      const clubs = await getActiveClubs();
      const selectedClub = clubs.find((c) => c.id === clubId);
      if (!selectedClub) {
        setError(t("error.invalidClub"));
        return;
      }

      await saveProfileUser({
        uid: user.uid,
        email: user.email ?? "",
        displayName: displayName.trim(),
        clubId,
        positionTitle: positionTitle.trim() || undefined,
        departmentGrade: departmentGrade.trim() || undefined,
        profileCompleted: true,
      });

      setClubName(selectedClub.name);
      setSuccess(true);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.network"));
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
          <p className="text-[15px] text-neutral-600">{t("loginPrompt")}</p>
          <Link
            href={loginHref}
            className="mt-4 inline-block text-[14px] font-medium text-primary underline"
          >
            {t("goLogin")}
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
            {t("title")}
          </h1>
          <p className="mt-2 text-[14px] text-neutral-500">
            {t("subtitle")}
          </p>

          <form
            className="mt-8 flex flex-col gap-6 rounded-xl border border-border bg-white p-6 shadow-sm"
            onSubmit={handleSubmit}
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700">{t("nameLabel")}</span>
              <input
                required
                className="h-10 rounded-lg border border-border px-3 text-[13px] outline-none ring-primary/0 focus:ring-2 focus:ring-primary/30"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("namePlaceholder")}
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700">{t("clubLabel")}</span>
              <ClubSearchSelect
                value={clubId}
                onChange={setClubId}
                disabled={saving}
                placeholder={t("clubPlaceholder")}
                initialClubName={clubName}
              />
              <p className="text-[12px] text-neutral-400">
                {t("clubHint")}
              </p>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700">
                {t("positionLabel")}
              </span>
              <input
                className="h-10 rounded-lg border border-border px-3 text-[13px] outline-none ring-primary/0 focus:ring-2 focus:ring-primary/30"
                value={positionTitle}
                onChange={(e) => setPositionTitle(e.target.value)}
                placeholder={t("positionPlaceholder")}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-medium text-neutral-700">
                {t("departmentGradeLabel")}
              </span>
              <input
                className="h-10 rounded-lg border border-border px-3 text-[13px] outline-none ring-primary/0 focus:ring-2 focus:ring-primary/30"
                value={departmentGrade}
                onChange={(e) => setDepartmentGrade(e.target.value)}
                placeholder={t("departmentGradePlaceholder")}
              />
            </label>

            {error ? (
              <p className="text-[13px] text-red-600">{error}</p>
            ) : null}
            {success ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700">
                {t("saved")}
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? t("saving") : t("save")}
              </Button>
            </div>
          </form>

          <div className="mt-10 flex justify-center">
            <Link
              href="/"
              className="group inline-flex items-center gap-1 text-sm font-[450] text-neutral-500 transition-colors hover:text-primary"
            >
              <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              {t("backHome")}
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
