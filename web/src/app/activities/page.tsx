"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

type Category = "全部" | "社博" | "大會" | "講座" | "其他";

interface PostItem {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  excerpt: string;
  cover_image_url: string | null;
  published_at_display: string;
}

const TAG_CATEGORIES: { label: Category; tag?: string }[] = [
  { label: "全部" },
  { label: "社博", tag: "社博" },
  { label: "大會", tag: "大會" },
  { label: "講座", tag: "講座" },
  { label: "其他", tag: "其他" },
];

const categoryBadgeColor: Record<string, string> = {
  社博: "bg-primary",
  大會: "bg-emerald-600",
  講座: "bg-amber-600",
  其他: "bg-neutral-600",
};

function getBadgeLabel(tags: string[]): string {
  for (const t of ["社博", "大會", "講座", "其他"]) {
    if (tags.includes(t)) return t;
  }
  return tags[0] ?? "其他";
}

export default function ActivitiesPage() {
  const [activeCategory, setActiveCategory] = useState<Category>("全部");
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const perPage = 6;

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const tagParam = TAG_CATEGORIES.find((c) => c.label === activeCategory);
      const params = new URLSearchParams({
        category: "activity_review",
        page: String(page),
        per_page: String(perPage),
      });
      if (tagParam?.tag) params.set("tag", tagParam.tag);

      const res = await fetch(`/api/public/posts?${params}`);
      const data = await res.json();
      setPosts(data.posts ?? []);
      setTotalPages(data.total_pages ?? 1);
    } catch {
      setPosts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, page]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return (
    <PublicLayout>
      <section className="w-full">
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-20">
          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-6 border-t border-neutral-400"
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600">
                ACTIVITIES
              </span>
            </div>
            <h1 className="mt-4 text-[40px] font-bold leading-[1.1] tracking-tight text-neutral-950">
              活動回顧
            </h1>
          </div>

          {/* Category tabs */}
          <div className="mb-8 flex items-center gap-2">
            {TAG_CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => {
                  setActiveCategory(cat.label);
                  setPage(1);
                }}
                className={`inline-flex h-[32px] items-center rounded-full px-3 text-xs font-[500] transition-colors ${activeCategory === cat.label
                    ? "bg-primary text-white"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(10,10,10,0.08)]">
                  <div className="aspect-[16/9] animate-pulse bg-neutral-100" />
                  <div className="bg-white p-4">
                    <div className="h-3 w-20 animate-pulse rounded bg-neutral-100" />
                    <div className="mt-3 h-4 w-3/4 animate-pulse rounded bg-neutral-100" />
                    <div className="mt-2 h-3 w-full animate-pulse rounded bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="rounded-xl border border-border bg-neutral-50 py-12 text-center text-[14px] text-neutral-500">
              目前沒有已發布的活動回顧。
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((item) => {
                const badge = getBadgeLabel(item.tags);
                return (
                  <Link
                    key={item.id}
                    href={`/activities/${item.slug}`}
                    className="group overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-shadow duration-150 hover:shadow-[0_0_0_1px_rgba(10,10,10,0.12),0_2px_8px_rgba(10,10,10,0.06)]"
                  >
                    <div className="relative aspect-[16/9] bg-neutral-200">
                      {item.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.cover_image_url}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                      <span
                        className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium text-white ${categoryBadgeColor[badge] ?? "bg-neutral-600"}`}
                      >
                        {badge}
                      </span>
                    </div>
                    <div className="bg-white p-4">
                      <time className="font-mono text-[11px] text-neutral-400">
                        {item.published_at_display}
                      </time>
                      <h3 className="mt-2 text-[14px] font-semibold tracking-tight text-neutral-950 group-hover:text-primary">
                        {item.title}
                      </h3>
                      <p className="mt-1.5 line-clamp-2 text-[12px] text-neutral-600">
                        {item.excerpt}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeftIcon className="h-4 w-4 text-neutral-600" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium transition-colors ${page === p
                      ? "bg-primary text-white"
                      : "text-neutral-600 ring-1 ring-neutral-950/8 hover:bg-neutral-50"
                    }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRightIcon className="h-4 w-4 text-neutral-600" />
              </button>
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
