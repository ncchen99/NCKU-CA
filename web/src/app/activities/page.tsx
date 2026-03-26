import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { DEFAULT_PRIMARY_TAG, getPrimaryPostTag, getPublishedPosts } from "@/lib/firestore/posts";
import { anyTimestampToDate } from "@/lib/datetime";

export const revalidate = 300;

type SearchParams = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<SearchParams> };

interface PostItem {
    id: string;
    slug: string;
    title: string;
    tags: string[];
    primary_tag: string;
    excerpt: string;
    cover_image_url: string | null;
    published_at_display: string;
}

const PER_PAGE = 6;
const ALL_TAG_LABEL = "全部";
const OTHER_TAG_LABEL = "其他";

function getTopTags(items: PostItem[], topN = 3): string[] {
    const counts = new Map<string, number>();
    for (const item of items) {
        const tag = item.primary_tag;
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
        .sort((a, b) => {
            if (a[1] !== b[1]) return b[1] - a[1];
            return a[0].localeCompare(b[0], "zh-Hant");
        })
        .slice(0, topN)
        .map(([tag]) => tag);
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}

function parsePage(raw: string | undefined): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.floor(parsed);
}

function buildActivitiesHref(tag: string, page: number): string {
    const params = new URLSearchParams();
    if (tag !== ALL_TAG_LABEL) {
        params.set("tag", tag);
    }
    if (page > 1) {
        params.set("page", String(page));
    }
    const query = params.toString();
    return query ? `/activities?${query}` : "/activities";
}

export default async function ActivitiesPage({ searchParams }: Props) {
    const params = await searchParams;
    const requestedTag = firstQueryValue(params.tag)?.trim() || ALL_TAG_LABEL;
    const requestedPage = parsePage(firstQueryValue(params.page));

    let allPosts: PostItem[] = [];
    let totalPages = 1;
    let activeTag = ALL_TAG_LABEL;
    let visiblePosts: PostItem[] = [];
    let tagFilters: string[] = [ALL_TAG_LABEL, OTHER_TAG_LABEL];

    try {
        const result = await getPublishedPosts({
            category: "activity_review",
        });

        allPosts = result.posts.map((post) => {
            const publishedAt = anyTimestampToDate(post.published_at);
            return {
                id: post.id,
                slug: post.slug,
                title: post.title,
                tags: Array.isArray(post.tags) ? post.tags.map((t) => String(t)) : [],
                primary_tag: getPrimaryPostTag(post.tags, DEFAULT_PRIMARY_TAG),
                excerpt:
                    post.content_markdown?.substring(0, 120)?.replace(/[#*_>\-\[\]`]/g, "") ?? "",
                cover_image_url: post.cover_image_url ?? null,
                published_at_display: publishedAt
                    ? publishedAt.toLocaleDateString("zh-TW", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                    })
                    : "—",
            };
        });

        const topTags = getTopTags(allPosts);
        const topTagSet = new Set(topTags);
        tagFilters = [ALL_TAG_LABEL, ...topTags, OTHER_TAG_LABEL];
        const validTagSet = new Set(tagFilters);
        activeTag = validTagSet.has(requestedTag) ? requestedTag : ALL_TAG_LABEL;

        if (activeTag === ALL_TAG_LABEL) {
            visiblePosts = allPosts;
        } else if (activeTag === OTHER_TAG_LABEL) {
            visiblePosts = allPosts.filter((post) => !topTagSet.has(post.primary_tag));
        } else {
            visiblePosts = allPosts.filter((post) => post.primary_tag === activeTag);
        }

        totalPages = Math.max(1, Math.ceil(visiblePosts.length / PER_PAGE));
    } catch {
        allPosts = [];
        visiblePosts = [];
        totalPages = 1;
    }

    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * PER_PAGE;
    const posts = visiblePosts.slice(offset, offset + PER_PAGE);

    return (
        <PublicLayout>
            <section className="w-full">
                <div className="mx-auto max-w-6xl px-6 pt-24 pb-20">
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

                    <div className="mb-8 flex items-center gap-2">
                        {tagFilters.map((tag) => (
                            <Link
                                key={tag}
                                href={buildActivitiesHref(tag, 1)}
                                className={`inline-flex h-[32px] items-center rounded-full px-3 text-xs font-[500] transition-colors ${activeTag === tag
                                    ? "bg-primary text-white"
                                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                    }`}
                            >
                                {tag}
                            </Link>
                        ))}
                    </div>

                    {posts.length === 0 ? (
                        <div className="rounded-xl border border-border bg-neutral-50 py-12 text-center text-[14px] text-neutral-500">
                            目前沒有已發布的活動回顧。
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {posts.map((item) => {
                                const badge = item.primary_tag;
                                return (
                                    <Link
                                        key={item.id}
                                        href={`/activities/${item.slug}`}
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
                                                className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium text-white ${badge === OTHER_TAG_LABEL ? "bg-neutral-600" : "bg-primary"}`}
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

                    {totalPages > 1 && (
                        <div className="mt-12 flex items-center justify-center gap-2">
                            <Link
                                href={buildActivitiesHref(activeTag, Math.max(1, page - 1))}
                                aria-disabled={page === 1}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50 aria-disabled:pointer-events-none aria-disabled:opacity-40"
                            >
                                <ChevronLeftIcon className="h-4 w-4 text-neutral-600" />
                            </Link>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <Link
                                    key={p}
                                    href={buildActivitiesHref(activeTag, p)}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium transition-colors ${page === p
                                        ? "bg-primary text-white"
                                        : "text-neutral-600 ring-1 ring-neutral-950/8 hover:bg-neutral-50"
                                        }`}
                                >
                                    {p}
                                </Link>
                            ))}
                            <Link
                                href={buildActivitiesHref(activeTag, Math.min(totalPages, page + 1))}
                                aria-disabled={page === totalPages}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50 aria-disabled:pointer-events-none aria-disabled:opacity-40"
                            >
                                <ChevronRightIcon className="h-4 w-4 text-neutral-600" />
                            </Link>
                        </div>
                    )}
                </div>
            </section>
        </PublicLayout>
    );
}
