"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { PublicLayout } from "@/components/layout/public-layout";
import { ClubSearchSelect } from "@/components/shared/club-search-select";
import { useAuth } from "@/lib/auth-context";
import { createLoginHref } from "@/lib/login-redirect";
import { Button } from "@/components/ui/button";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";
import { getOpenAttendanceEvents } from "@/lib/client-firestore";

type OpenEvent = {
  id: string;
  title: string;
  description?: string | null;
  closes_at_iso: string | null;
  opens_at_iso: string | null;
};

export default function AttendancePage() {
  const t = useTranslations("attendancePage");
  const locale = useLocale();
  const { user, firebaseUser, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const loginHref = createLoginHref(pathname);
  const [events, setEvents] = useState<OpenEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubId, setClubId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [defaultClubName, setDefaultClubName] = useState<string | undefined>(
    undefined,
  );
  const [passcode, setPasscode] = useState("");

  useEffect(() => {
    let cancelled = false;
    getOpenAttendanceEvents({ userUid: firebaseUser?.uid })
      .then((openEvents) => {
        if (cancelled) return;
        setEvents(openEvents);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [firebaseUser?.uid]);

  // Use user profile from auth context as a fallback or for real-time updates
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      // Only set if not already set by the initial fetch to avoid flickers
      setClubId((prev) => prev || user.club_id || "");
      setUserName((prev) => prev || user.display_name || "");
      setDefaultClubName((prev) => prev || user.club_name);
    } else if (firebaseUser) {
      setUserName((prev) => prev || firebaseUser.displayName || "");
    }
  }, [authLoading, user, firebaseUser]);

  const event = events[0];
  const deadline = (() => {
    const raw = event?.closes_at_iso;
    if (!raw) return "—";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(locale === "en" ? "en" : "zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!event) {
      setError(t("error.noOpenEvent"));
      return;
    }
    if (!clubId) {
      setError(t("error.selectClub"));
      return;
    }
    if (!passcode.trim()) {
      setError(t("error.enterPasscode"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          club_id: clubId,
          passcode: passcode.trim()
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        ok?: boolean;
      };
      if (!res.ok) {
        setError(data.error ?? t("error.submitFailed"));
        return;
      }
      setMessage(t("success.checkedIn"));
    } catch {
      setError(t("error.network"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PublicLayout>
      <section className="w-full">
        <div className="mx-auto max-w-2xl px-6 pt-24 pb-20">
          <div className="mb-10">
            <h1 className="text-[32px] font-bold tracking-tight text-neutral-950">
              {t("title")}
            </h1>
            <p className="mt-2 text-[14px] text-neutral-500">
              {t("subtitle")}
            </p>
          </div>

          {loading ? (
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100" />
          ) : !event ? (
            <div className="rounded-xl border border-border bg-neutral-50 px-5 py-8 text-center text-[14px] text-neutral-600">
              {t("empty")}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
              <h2 className="text-[18px] font-[650] text-neutral-950">
                {event.title}
              </h2>
              {event.description ? (
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-600">
                  {event.description}
                </p>
              ) : null}
              <p className="mt-4 text-[13px] text-neutral-500">
                {t("deadlineLabel")}<span className="font-medium text-neutral-800">{deadline}</span>
              </p>

              {!authLoading && !firebaseUser ? (
                <div className="mt-6 rounded-lg bg-neutral-50 px-4 py-3 text-[13px] text-neutral-700">
                  {t("loginRequired")} {" "}
                  <Link href={loginHref} className="font-medium text-primary underline">
                    {t("goLogin")}
                  </Link>
                </div>
              ) : (
                <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit}>
                  {userName && (
                    <div className="rounded-lg border border-neutral-100 bg-neutral-50/50 px-4 py-3">
                      <p className="text-[13px] text-neutral-500">{t("attendee")}</p>
                      <p className="text-[14px] font-semibold text-neutral-900">
                        {userName}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-[13px] font-medium text-neutral-700">{t("clubLabel")}</p>
                    <ClubSearchSelect
                      value={clubId}
                      onChange={setClubId}
                      placeholder={t("clubPlaceholder")}
                      initialClubName={defaultClubName}
                      disabled={submitting}
                      allowClear={false}
                    />
                    <p className="mt-1 text-xs text-neutral-400">
                      {t("clubHint")}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-neutral-700">{t("passcodeLabel")}</label>
                    <input
                      type="text"
                      className="block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:bg-neutral-50 disabled:text-neutral-500"
                      placeholder={t("passcodePlaceholder")}
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  {error ? (
                    <p className="text-[13px] text-red-600">{error}</p>
                  ) : null}
                  {message ? (
                    <p className="text-[13px] text-emerald-700">{message}</p>
                  ) : null}
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting || !firebaseUser}
                  >
                    {submitting ? t("submitting") : t("submit")}
                  </Button>
                </form>
              )}
            </div>
          )}

          <div className="mt-12 flex justify-center">
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
