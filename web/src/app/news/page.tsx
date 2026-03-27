import { PublicLayout } from "@/components/layout/public-layout";
import { DEFAULT_PRIMARY_TAG, getPrimaryPostTag, getPublishedPosts } from "@/lib/firestore/posts";
import { anyTimestampToDate } from "@/lib/datetime";
import { PostListing } from "@/components/public/post-listing";
import { getLocale } from "next-intl/server";
import { normalizeLocale } from "@/lib/i18n-config";

export const revalidate = 31_536_000;

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

export default async function NewsPage() {
    const locale = normalizeLocale(await getLocale());
    const isEn = locale === "en";

    let allPosts: PostItem[] = [];

    try {
        const result = await getPublishedPosts({
            category: "news",
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
                    ? publishedAt.toLocaleDateString(isEn ? "en" : "zh-TW", {
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
                                NEWS
                            </span>
                        </div>
                        <h1 className="mt-4 text-[40px] font-bold leading-[1.1] tracking-tight text-neutral-950">
                            {isEn ? "News" : "最新消息"}
                        </h1>
                    </div>

                    <PostListing
                        posts={allPosts}
                        basePath="/news"
                        emptyText={isEn ? "No published news yet." : "目前沒有已發布的消息。"}
                    />
                </div>
            </section>
        </PublicLayout>
    );
}
