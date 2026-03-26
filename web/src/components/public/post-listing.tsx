"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface PostListItem {
    id: string;
    slug: string;
    title: string;
    primary_tag: string;
    excerpt: string;
    cover_image_url: string | null;
    published_at_display: string;
}

interface PostListingProps {
    posts: PostListItem[];
    basePath: "/news" | "/activities";
    initialTag?: string;
    initialPage?: number;
    emptyText: string;
}

const PER_PAGE = 6;
const ALL_TAG_LABEL = "全部";
const OTHER_TAG_LABEL = "其他";

function getTopTags(items: PostListItem[], topN = 3): string[] {
    const counts = new Map<string, number>();
    for (const item of items) {
        counts.set(item.primary_tag, (counts.get(item.primary_tag) ?? 0) + 1);
    }

    return Array.from(counts.entries())
        .sort((a, b) => {
            if (a[1] !== b[1]) return b[1] - a[1];
            return a[0].localeCompare(b[0], "zh-Hant");
        })
        .slice(0, topN)
        .map(([tag]) => tag);
}

function buildListingHref(basePath: string, tag: string, page: number): string {
    const params = new URLSearchParams();
    if (tag !== ALL_TAG_LABEL) params.set("tag", tag);
    if (page > 1) params.set("page", String(page));

    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
}

export function PostListing({
    posts,
    basePath,
    initialTag,
    initialPage,
    emptyText,
}: PostListingProps) {
    const topTags = useMemo(() => getTopTags(posts), [posts]);
    const topTagSet = useMemo(() => new Set(topTags), [topTags]);
    const tagFilters = useMemo(
        () => [ALL_TAG_LABEL, ...topTags, OTHER_TAG_LABEL],
        [topTags]
    );

    const [activeTag, setActiveTag] = useState<string>(
        initialTag?.trim() || ALL_TAG_LABEL
    );
    const [page, setPage] = useState<number>(() => {
        if (!Number.isFinite(initialPage) || !initialPage) return 1;
        return Math.max(1, Math.floor(initialPage));
    });

    const resolvedActiveTag = tagFilters.includes(activeTag)
        ? activeTag
        : ALL_TAG_LABEL;

    const visiblePosts = useMemo(() => {
        if (resolvedActiveTag === ALL_TAG_LABEL) return posts;
        if (resolvedActiveTag === OTHER_TAG_LABEL) {
            return posts.filter((post) => !topTagSet.has(post.primary_tag));
        }
        return posts.filter((post) => post.primary_tag === resolvedActiveTag);
    }, [posts, resolvedActiveTag, topTagSet]);

    const totalPages = Math.max(1, Math.ceil(visiblePosts.length / PER_PAGE));
    const currentPage = Math.min(page, totalPages);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const href = buildListingHref(basePath, resolvedActiveTag, currentPage);
        const currentUrl = `${window.location.pathname}${window.location.search}`;
        if (currentUrl !== href) {
            window.history.replaceState(window.history.state, "", href);
        }
    }, [basePath, currentPage, resolvedActiveTag]);

    const offset = (currentPage - 1) * PER_PAGE;
    const pagedPosts = visiblePosts.slice(offset, offset + PER_PAGE);

    return (
        <>
            <div className="mb-8 grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
                {tagFilters.map((tag) => {
                    const isActive = resolvedActiveTag === tag;
                    return (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => {
                                setActiveTag(tag);
                                setPage(1);
                            }}
                            aria-pressed={isActive}
                            className={`inline-flex h-8 w-full min-w-0 items-center justify-center rounded-full px-2 text-[11px] font-[500] whitespace-nowrap transition-colors sm:h-[34px] sm:w-auto sm:px-3 sm:text-xs ${isActive
                                    ? "bg-primary text-white"
                                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                }`}
                            title={tag}
                        >
                            <span className="block truncate">{tag}</span>
                        </button>
                    );
                })}
            </div>

            {pagedPosts.length === 0 ? (
                <div className="rounded-xl border border-border bg-neutral-50 py-12 text-center text-[14px] text-neutral-500">
                    {emptyText}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {pagedPosts.map((item) => {
                        const badge = item.primary_tag;
                        return (
                            <Link
                                key={item.id}
                                href={`${basePath}/${item.slug}`}
                                className="group overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-shadow duration-150 hover:shadow-[0_0_0_1px_rgba(10,10,10,0.12),0_2px_8px_rgba(10,10,10,0.06)]"
                            >
                                <div className="relative h-44 w-full bg-neutral-200">
                                    {item.cover_image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={item.cover_image_url}
                                            alt={item.title}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : null}
                                    <span
                                        className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium text-white ${badge === OTHER_TAG_LABEL ? "bg-neutral-600" : "bg-primary"
                                            }`}
                                    >
                                        {badge}
                                    </span>
                                </div>
                                <div className="bg-white p-4">
                                    <time className="font-mono text-[11px] text-neutral-400">
                                        {item.published_at_display}
                                    </time>
                                    <h3 className="mt-2 text-[14px] font-semibold tracking-tight text-neutral-950 transition-colors group-hover:text-primary">
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

            {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        aria-label="上一頁"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-40"
                    >
                        <ChevronLeftIcon className="h-4 w-4 text-neutral-600" />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        const isCurrent = currentPage === p;
                        return (
                            <button
                                key={p}
                                type="button"
                                onClick={() => setPage(p)}
                                aria-current={isCurrent ? "page" : undefined}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium transition-colors ${isCurrent
                                        ? "bg-primary text-white"
                                        : "text-neutral-600 ring-1 ring-neutral-950/8 hover:bg-neutral-50"
                                    }`}
                            >
                                {p}
                            </button>
                        );
                    })}

                    <button
                        type="button"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="下一頁"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-40"
                    >
                        <ChevronRightIcon className="h-4 w-4 text-neutral-600" />
                    </button>
                </div>
            )}
        </>
    );
}
