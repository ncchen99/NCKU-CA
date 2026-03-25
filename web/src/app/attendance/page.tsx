"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PublicLayout } from "@/components/layout/public-layout";
import { ClubSearchSelect } from "@/components/shared/club-search-select";
import { useAuth } from "@/lib/auth-context";
import { createLoginHref } from "@/lib/login-redirect";
import { formatDateTimeZhTWFromUnknown } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";

type OpenEvent = {
  id: string;
  title: string;
  description?: string | null;
  closes_at_iso: string | null;
  opens_at_iso: string | null;
};

export default function AttendancePage() {
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
    fetch("/api/public/attendance/open")
      .then((r) => r.json())
      .then((d: { events?: OpenEvent[]; user?: any }) => {
        if (cancelled) return;
        setEvents(d.events ?? []);
        if (d.user) {
          setClubId(d.user.club_id || "");
          setUserName(d.user.display_name || "");
          setDefaultClubName(d.user.club_name || undefined);
        }
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
  }, []);

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
  const deadline =
    event?.closes_at_iso != null
      ? formatDateTimeZhTWFromUnknown(event.closes_at_iso)
      : "—";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!event) {
      setError("目前沒有開放中的點名活動。");
      return;
    }
    if (!clubId) {
      setError("請選擇社團項目和名稱。");
      return;
    }
    if (!passcode.trim()) {
      setError("請輸入點名密碼。");
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
        setError(data.error ?? "簽到失敗");
        return;
      }
      setMessage("簽到成功，感謝配合。");
    } catch {
      setError("網路錯誤，請稍後再試。");
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
              活動簽到
            </h1>
            <p className="mt-2 text-[14px] text-neutral-500">
              請於截止時間前完成簽到；每個社團僅能簽到一次。
            </p>
          </div>

          {loading ? (
            <div className="h-24 animate-pulse rounded-xl bg-neutral-100" />
          ) : !event ? (
            <div className="rounded-xl border border-border bg-neutral-50 px-5 py-8 text-center text-[14px] text-neutral-600">
              目前沒有開放中的點名活動。
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
                截止時間：<span className="font-medium text-neutral-800">{deadline}</span>
              </p>

              {!authLoading && !firebaseUser ? (
                <div className="mt-6 rounded-lg bg-neutral-50 px-4 py-3 text-[13px] text-neutral-700">
                  簽到需先登入。{" "}
                  <Link href={loginHref} className="font-medium text-primary underline">
                    前往登入
                  </Link>
                </div>
              ) : (
                <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit}>
                  {userName && (
                    <div className="rounded-lg border border-neutral-100 bg-neutral-50/50 px-4 py-3">
                      <p className="text-[13px] text-neutral-500">簽到者</p>
                      <p className="text-[14px] font-semibold text-neutral-900">
                        {userName}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-[13px] font-medium text-neutral-700">簽到單位</p>
                    <ClubSearchSelect
                      value={clubId}
                      onChange={setClubId}
                      placeholder="搜尋並選擇您的社團"
                      initialClubName={defaultClubName}
                      disabled={submitting}
                      allowClear={false}
                    />
                    <p className="mt-1 text-xs text-neutral-400">
                      若搜尋不到，請確認社團名稱是否正確
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-medium text-neutral-700">點名密碼</label>
                    <input
                      type="text"
                      className="block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:bg-neutral-50 disabled:text-neutral-500"
                      placeholder="請輸入後台提供的點名密碼"
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
                    {submitting ? "送出中…" : "確認簽到"}
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
              返回首頁
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
