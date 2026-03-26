import { PublicLayout } from "@/components/layout/public-layout";
import { DEFAULT_PRIMARY_TAG, getPrimaryPostTag, getPublishedPosts } from "@/lib/firestore/posts";
import { anyTimestampToDate } from "@/lib/datetime";
import { PostListing } from "@/components/public/post-listing";

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

function firstQueryValue(value: string | string[] | undefined): string | undefined {
    if (Array.isArray(value)) return value[0];
    return value;
}

function parsePage(raw: string | undefined): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 1) return 1;
    return Math.floor(parsed);
}

export default async function ActivitiesPage({ searchParams }: Props) {
    const params = await searchParams;
    const requestedTag = firstQueryValue(params.tag)?.trim() || "全部";
    const requestedPage = parsePage(firstQueryValue(params.page));

    let allPosts: PostItem[] = [];

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

    } catch {
        allPosts = [];
    }

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

                    <PostListing
                        posts={allPosts}
                        basePath="/activities"
                        initialTag={requestedTag}
                        initialPage={requestedPage}
                        emptyText="目前沒有已發布的活動回顧。"
                    />
                </div>
            </section>
        </PublicLayout>
    );
}
