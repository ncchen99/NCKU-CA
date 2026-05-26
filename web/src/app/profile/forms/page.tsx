"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PublicLayout } from "@/components/layout/public-layout";
import { useAuth } from "@/lib/auth-context";
import { createLoginHref } from "@/lib/login-redirect";
import { formatDateTimeZhTW } from "@/lib/datetime";
import {
  getMyFormResponseItems,
  type MyFormResponseItem,
} from "@/lib/client-firestore";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

type FormResponseItem = MyFormResponseItem;

export default function MyFormResponsesPage() {
  const { firebaseUser, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const loginHref = createLoginHref(pathname);

  const [items, setItems] = useState<FormResponseItem[]>([]);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = authLoading || (!!firebaseUser && !fetched);

  useEffect(() => {
    if (authLoading || !firebaseUser) return;
    let cancelled = false;
    getMyFormResponseItems(firebaseUser.uid)
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
          <p className="text-[15px] text-neutral-600">請先登入以檢視表單記錄。</p>
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
            表單記錄
          </h1>
          <p className="mt-2 text-[14px] text-neutral-500">
            您過去送出的所有表單回覆；在截止前仍可點擊「修改」更新內容。
          </p>

          <div className="mt-8 rounded-xl border border-border bg-white shadow-sm">
            {loading ? (
              <div className="flex flex-col divide-y divide-border">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-5">
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/3 animate-pulse rounded bg-neutral-100" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center text-[13px] text-red-600">{error}</div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-[13px] text-neutral-500">
                還沒有填過任何表單。
              </div>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {items.map((it) => {
                  const submittedAt = it.submitted_at_iso
                    ? new Date(it.submitted_at_iso)
                    : null;
                  const closesAt = it.closes_at_iso
                    ? new Date(it.closes_at_iso)
                    : null;
                  return (
                    <li
                      key={`${it.form_id}-${it.response_id}`}
                      className="flex items-start justify-between gap-4 px-5 py-4"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-neutral-950">
                          {it.form_title}
                        </p>
                        <p className="mt-1 font-mono text-[12px] text-neutral-500">
                          送出：{formatDateTimeZhTW(submittedAt)}
                        </p>
                        {closesAt && (
                          <p className="font-mono text-[12px] text-neutral-400">
                            截止：{formatDateTimeZhTW(closesAt)}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0">
                        {it.editable ? (
                          <Link
                            href={`/forms/${it.form_id}?responseId=${it.response_id}`}
                            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-[450] text-neutral-700 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50 hover:text-primary"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            修改
                          </Link>
                        ) : (
                          <span className="inline-flex h-9 items-center rounded-full bg-neutral-100 px-3 font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                            已截止
                          </span>
                        )}
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
