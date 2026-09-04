"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PublicLayout } from "@/components/layout/public-layout";
import { useAuth } from "@/lib/auth-context";
import { createLoginHref } from "@/lib/login-redirect";
import { formatDateTimeZhTW } from "@/lib/datetime";
import { getMyAttendanceItems, type MyAttendanceItem } from "@/lib/client-firestore";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";

type AttendanceItem = MyAttendanceItem;

export default function MyAttendancePage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const loginHref = createLoginHref(pathname);

  const [items, setItems] = useState<AttendanceItem[]>([]);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = authLoading || (!!firebaseUser && !fetched);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    let cancelled = false;
    getMyAttendanceItems()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "讀取失敗");
      })
      .finally(() => {
        if (!cancelled) setFetched(true);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, firebaseUser]);

  if (authLoading) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-6 pt-32 pb-24">
          <div className="h-40 animate-pulse rounded-xl bg-neutral-100" />
        </div>
      </PublicLayout>
    );
  }

  if (!firebaseUser) {
    return (
      <PublicLayout>
        <div className="mx-auto max-w-3xl px-6 pt-32 pb-24 text-center">
          <p className="text-[15px] text-neutral-600">請先登入以檢視點名記錄。</p>
          <Link
            href={loginHref}
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
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-20">
          <h1 className="text-[28px] font-bold tracking-tight text-neutral-950">
            點名記錄
          </h1>
          <p className="mt-2 text-[14px] text-neutral-500">
            您過去所有的簽到紀錄；若同一場活動重複簽到只會記第一筆為有效。
          </p>

          <div className="mt-8 rounded-xl border border-border bg-white">
            {loading ? (
              <div className="flex flex-col divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-5">
                    <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center text-[13px] text-red-600">
                {error}
              </div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-neutral-500">
                還沒有任何點名記錄。
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {items.map((it) => {
                  const dt = it.checked_in_at_iso
                    ? new Date(it.checked_in_at_iso)
                    : null;
                  return (
                    <li
                      key={`${it.event_id}-${it.id}`}
                      className="flex items-start justify-between gap-4 px-5 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-[14px] font-medium text-neutral-950">
                            {it.event_title}
                          </p>
                          {it.is_duplicate_attempt && (
                            <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                              重複
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-[12px] text-neutral-500">
                          社團：{it.club_name}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[12px] text-neutral-500">
                          {formatDateTimeZhTW(dt)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/profile"
              className="group inline-flex items-center gap-1 text-sm font-[450] text-neutral-500 transition-colors hover:text-primary"
            >
              <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              返回個人資料
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
