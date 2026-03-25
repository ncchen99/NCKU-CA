import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { getPublishedPosts } from "@/lib/firestore/posts";
import { anyTimestampToDate } from "@/lib/datetime";

export const revalidate = 300;

type Category = "全部" | "公告" | "活動" | "重要";
type SearchParams = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<SearchParams> };

interface PostItem {
    id: string;
    slug: string;
    title: string;
    tags: string[];
    excerpt: string;
    cover_image_url: string | null;
    published_at_display: string;
}

const TAG_CATEGORIES: { label: Category; tag?: string }[] = [
    { label: "全部" },
    { label: "公告", tag: "公告" },
    { label: "活動", tag: "活動" },
    { label: "重要", tag: "重要" },
];

const categoryBadgeColor: Record<string, string> = {
    公告: "bg-primary",
    活動: "bg-emerald-600",
    重要: "bg-red-600",
};

const PER_PAGE = 6;

function getBadgeLabel(tags: string[]): string {
    for (const t of ["重要", "活動", "公告"]) {
        if (tags.includes(t)) return t;
    }
    return tags[0] ?? "公告";
}

function firstQueryValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}

function parseCategory(raw: string | undefined): Category {
    if (raw === "公告" || raw === "活動" || raw === "重要") {
        return raw;
    }
    return "全部";
}

function parsePage(raw: string | undefined): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.floor(parsed);
}

function buildNewsHref(category: Category, page: number): string {
    const params = new URLSearchParams();
    if (category !== "全部") {
        params.set("tag", category);
    }
    if (page > 1) {
        params.set("page", String(page));
    }
    const query = params.toString();
    return query ? `/news?${query}` : "/news";
}

export default async function NewsPage({ searchParams }: Props) {
    const params = await searchParams;
    const activeCategory = parseCategory(firstQueryValue(params.tag));
    const requestedPage = parsePage(firstQueryValue(params.page));
    const tagParam = TAG_CATEGORIES.find((c) => c.label === activeCategory)?.tag;

    let posts: PostItem[] = [];
    let totalPages = 1;

    try {
        const offset = (requestedPage - 1) * PER_PAGE;
        const result = await getPublishedPosts({
            category: "news",
            limit: PER_PAGE,
            offset,
            tag: tagParam,
        });

        totalPages = Math.max(1, Math.ceil(result.total / PER_PAGE));
        posts = result.posts.map((post) => {
            const publishedAt = anyTimestampToDate(post.published_at);
            return {
                id: post.id,
                slug: post.slug,
                title: post.title,
                tags: Array.isArray(post.tags) ? post.tags.map((t) => String(t)) : [],
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
    } catch {
        posts = [];
        totalPages = 1;
    }

    const page = Math.min(requestedPage, totalPages);

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
                                NEWS
                            </span>
                        </div>
                        <h1 className="mt-4 text-[40px] font-bold leading-[1.1] tracking-tight text-neutral-950">
                            最新消息
                        </h1>
                    </div>

                    <div className="mb-8 flex items-center gap-2">
                        {TAG_CATEGORIES.map((cat) => (
                            <Link
                                key={cat.label}
                                href={buildNewsHref(cat.label, 1)}
                                className={`inline-flex h-[32px] items-center rounded-full px-3 text-xs font-[500] transition-colors ${activeCategory === cat.label
                                        ? "bg-primary text-white"
                                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                                    }`}
                            >
                                {cat.label}
                            </Link>
                        ))}
                    </div>

                    {posts.length === 0 ? (
                        <div className="rounded-xl border border-border bg-neutral-50 py-12 text-center text-[14px] text-neutral-500">
                            目前沒有已發布的消息。
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {posts.map((item) => {
                                const badge = getBadgeLabel(item.tags);
                                return (
                                    <Link
                                        key={item.id}
                                        href={`/news/${item.slug}`}
                                        className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-all duration-200 hover:shadow-[0_4px_12px_-2px_rgba(10,10,10,0.12),0_0_0_1px_rgba(10,10,10,0.08)] hover:-translate-y-0.5"
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
                                                className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium text-white ${categoryBadgeColor[badge] ?? "bg-neutral-600"}`}
                                            >
                                                {badge}
                                            </span>
                                        </div>
                                        <div className="bg-white p-4">
                                            <time className="font-mono text-[11px] text-neutral-400">
                                                {item.published_at_display}
                                            </time>
                                            <h3 className="mt-2 text-[14px] font-semibold tracking-tight text-neutral-950 group-hover:text-primary transition-colors">
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
                                href={buildNewsHref(activeCategory, Math.max(1, page - 1))}
                                aria-disabled={page === 1}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50 aria-disabled:pointer-events-none aria-disabled:opacity-40"
                            >
                                <ChevronLeftIcon className="h-4 w-4 text-neutral-600" />
                            </Link>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                                <Link
                                    key={p}
                                    href={buildNewsHref(activeCategory, p)}
                                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-medium transition-colors ${page === p
                                            ? "bg-primary text-white"
                                            : "text-neutral-600 ring-1 ring-neutral-950/8 hover:bg-neutral-50"
                                        }`}
                                >
                                    {p}
                                </Link>
                            ))}
                            <Link
                                href={buildNewsHref(activeCategory, Math.min(totalPages, page + 1))}
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
