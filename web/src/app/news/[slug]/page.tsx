import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { PublicLayout } from "@/components/layout/public-layout";
import { CmsMarkdownWithToc } from "@/components/public/cms-markdown-with-toc";
import { DEFAULT_PRIMARY_TAG, getAllPostSlugs, getPostBySlug, getPrimaryPostTag, getPublishedPosts } from "@/lib/firestore/posts";
import { anyTimestampToDate } from "@/lib/datetime";
import { buildOgImageUrl } from "@/lib/seo";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";
import { normalizeLocale } from "@/lib/i18n-config";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 31_536_000;

export async function generateStaticParams() {
  try {
    const slugs = await getAllPostSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = normalizeLocale(await getLocale());
  const isEn = locale === "en";
  const { slug } = await params;
  const canonicalPath = `/news/${slug}`;
  try {
    const post = await getPostBySlug(slug);
    if (!post) return { title: isEn ? "Post Not Found" : "文章未找到" };
    const description = isEn
      ? `${post.title} — NCKU Club Association News`
      : `${post.title} — 成大社聯會最新消息`;
    const ogImage = buildOgImageUrl({
      title: post.title,
      subtitle: isEn ? "News" : "最新消息",
      path: canonicalPath,
    });

    return {
      title: post.title,
      description,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title: `${post.title} | ${isEn ? "NCKU Club Association" : "成大社聯會"}`,
        description,
        url: canonicalPath,
        images: [ogImage],
      },
      twitter: {
        card: "summary_large_image",
        images: [ogImage],
      },
    };
  } catch {
    return { title: isEn ? "Post Not Found" : "文章未找到" };
  }
}

const categoryBadgeColor: Record<string, string> = {
  公告: "bg-primary",
  活動: "bg-emerald-600",
  重要: "bg-red-600",
};

export default async function NewsArticlePage({ params }: Props) {
  const locale = normalizeLocale(await getLocale());
  const isEn = locale === "en";
  const { slug } = await params;

  let post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    post = null;
  }

  if (!post || post.category !== "news") {
    notFound();
  }

  const publishedAt = anyTimestampToDate(post.published_at);
  const dateStr = publishedAt
    ? publishedAt.toLocaleDateString(isEn ? "en" : "zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    : "—";

  const badgeLabel = getPrimaryPostTag(post.tags, DEFAULT_PRIMARY_TAG);

  // 取得相關文章
  let relatedPosts: { slug: string; title: string; date: string; excerpt: string; cover?: string | null }[] = [];
  try {
    const { posts: recent } = await getPublishedPosts({ category: "news", limit: 6 });
    relatedPosts = recent
      .filter((p) => p.slug !== slug)
      .slice(0, 3)
      .map((p) => {
        const d = anyTimestampToDate(p.published_at);
        return {
          slug: p.slug,
          title: p.title,
          cover: p.cover_image_url,
          excerpt: p.content_markdown?.substring(0, 60)?.replace(/[#*_>\-\[\]`]/g, "") ?? "",
          date: d
            ? d.toLocaleDateString("zh-TW", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
            : "—",
        };
      });
  } catch {
    /* 忽略 */
  }

  return (
    <PublicLayout>
      <section className="w-full">
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-20">
          {/* Breadcrumb */}
          <nav className="mb-8 flex min-w-0 flex-wrap items-center gap-1.5 text-[13px] sm:flex-nowrap">
            <Link
              href="/"
              className="whitespace-nowrap text-neutral-500 [text-orientation:mixed] [writing-mode:horizontal-tb] transition-colors hover:text-neutral-950"
            >
              {isEn ? "Home" : "首頁"}
            </Link>
            <span className="whitespace-nowrap text-neutral-400 [text-orientation:mixed] [writing-mode:horizontal-tb]">/</span>
            <Link
              href="/news"
              className="whitespace-nowrap text-neutral-500 [text-orientation:mixed] [writing-mode:horizontal-tb] transition-colors hover:text-neutral-950"
            >
              {isEn ? "News" : "最新消息"}
            </Link>
            <span className="whitespace-nowrap text-neutral-400 [text-orientation:mixed] [writing-mode:horizontal-tb]">/</span>
            <span className="min-w-0 max-w-full truncate text-neutral-950 [text-orientation:mixed] [writing-mode:horizontal-tb]">{post.title}</span>
          </nav>

          <div className="flex gap-12 lg:gap-16">
            {/* Main content */}
            <article className="min-w-0 flex-1">
              {/* Article header */}
              <div className="mb-10">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] font-medium text-white ${categoryBadgeColor[badgeLabel] ?? "bg-neutral-600"}`}
                >
                  {badgeLabel}
                </span>
                <h1 className="mt-4 text-[32px] font-bold leading-[1.15] tracking-tight text-neutral-950">
                  {post.title}
                </h1>
                <div className="mt-3 flex items-center gap-3">
                  <time className="font-mono text-[12px] text-neutral-400">
                    {dateStr}
                  </time>
                  {post.author_display_name && (
                    <>
                      <span className="h-3.5 w-px bg-neutral-200" aria-hidden />
                      <span className="text-[12px] text-neutral-500">
                        {post.author_display_name}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Cover image */}
              {post.cover_image_url && (
                <div className="mb-10 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-100">
                  <div className="aspect-[16/9] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Article content via Markdown */}
              {post.content_markdown ? (
                <CmsMarkdownWithToc markdown={post.content_markdown} />
              ) : (
                <p className="text-[15px] text-neutral-600">{isEn ? "This post has no content yet." : "此文章尚無內容。"}</p>
              )}

              {/* Related posts at the bottom */}
              {relatedPosts.length > 0 && (
                <div className="mt-20 border-t border-neutral-100 pt-12">
                  <div className="mt-6 font-bold text-[24px] tracking-tight text-neutral-950">
                    {isEn ? "Related Posts" : "相關文章"}
                  </div>
                  <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {relatedPosts.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/news/${r.slug}`}
                        className="group flex flex-col overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(10,10,10,0.12),0_0_0_1px_rgba(10,10,10,0.08)] hover:-translate-y-0.5"
                      >
                        <div className="aspect-[2/1] overflow-hidden bg-neutral-100">
                          {r.cover ? (
                            <img
                              src={r.cover}
                              alt={r.title}
                              className="h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                            />
                          ) : (
                            <div className="flex h-full w-full items-end bg-gradient-to-br from-neutral-200 via-neutral-100 to-white p-4">
                              <span className="font-mono text-[10px] tracking-wide text-neutral-500">
                                NCKU CA NEWS
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <time className="font-mono text-[10px] text-neutral-400">
                            {r.date}
                          </time>
                          <p className="mt-1 text-[13.5px] font-semibold leading-[1.4] text-neutral-800 group-hover:text-primary transition-colors line-clamp-2">
                            {r.title}
                          </p>
                          <p className="mt-1.5 text-[12px] text-neutral-500 line-clamp-1">
                            {r.excerpt}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-16 flex border-t border-neutral-100 pt-8">
                <Link
                  href="/news"
                  className="group inline-flex items-center gap-2 text-sm font-medium text-neutral-500 transition-colors hover:text-primary"
                >
                  <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                  {isEn ? "Back to News" : "返回最新消息"}
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
