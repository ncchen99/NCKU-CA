import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/layout/public-layout";
import { CmsMarkdownWithToc } from "@/components/public/cms-markdown-with-toc";
import { getPostBySlug, getPublishedPosts, getAllPostSlugs } from "@/lib/firestore/posts";
import { anyTimestampToDate } from "@/lib/datetime";
import { buildOgImageUrl } from "@/lib/seo";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 300;

export async function generateStaticParams() {
  try {
    const slugs = await getAllPostSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const canonicalPath = `/activities/${slug}`;
  try {
    const post = await getPostBySlug(slug);
    if (!post) return { title: "文章未找到" };
    const description = `${post.title} — 成大社聯會活動回顧`;
    const ogImage = buildOgImageUrl({
      title: post.title,
      subtitle: "活動回顧",
      path: canonicalPath,
    });

    return {
      title: post.title,
      description,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title: `${post.title} | 成大社聯會`,
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
    return { title: "文章未找到" };
  }
}

const categoryBadgeColor: Record<string, string> = {
  社博: "bg-primary",
  大會: "bg-emerald-600",
  講座: "bg-amber-600",
  其他: "bg-neutral-600",
};

export default async function ActivityArticlePage({ params }: Props) {
  const { slug } = await params;

  let post;
  try {
    post = await getPostBySlug(slug);
  } catch {
    post = null;
  }

  if (!post || post.category !== "activity_review") {
    notFound();
  }

  const publishedAt = anyTimestampToDate(post.published_at);
  const dateStr = publishedAt
    ? publishedAt.toLocaleDateString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    : "—";

  const badgeLabel = (() => {
    for (const t of ["社博", "大會", "講座", "其他"]) {
      if (post.tags?.includes(t)) return t;
    }
    return post.tags?.[0] ?? "其他";
  })();

  // 取得相關文章
  let relatedPosts: { slug: string; title: string; date: string }[] = [];
  try {
    const { posts: recent } = await getPublishedPosts({ category: "activity_review", limit: 4 });
    relatedPosts = recent
      .filter((p) => p.slug !== slug)
      .slice(0, 2)
      .map((p) => {
        const d = anyTimestampToDate(p.published_at);
        return {
          slug: p.slug,
          title: p.title,
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
          <nav className="mb-8 flex items-center gap-1.5 text-[13px]">
            <Link
              href="/"
              className="text-neutral-500 transition-colors hover:text-neutral-950"
            >
              首頁
            </Link>
            <span className="text-neutral-400">/</span>
            <Link
              href="/activities"
              className="text-neutral-500 transition-colors hover:text-neutral-950"
            >
              活動回顧
            </Link>
            <span className="text-neutral-400">/</span>
            <span className="truncate text-neutral-950">{post.title}</span>
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
                <p className="text-[15px] text-neutral-600">此文章尚無內容。</p>
              )}

              <Link
                href="/activities"
                className="group mt-12 inline-flex items-center gap-1 text-sm font-[450] text-primary hover:underline"
              >
                <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                返回活動回顧
              </Link>
            </article>

            {/* Sidebar */}
            {relatedPosts.length > 0 && (
              <aside className="hidden w-64 shrink-0 lg:block">
                <div className="sticky top-20">
                  <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-neutral-950">
                    其他活動
                  </h2>
                  <div className="mt-4 flex flex-col gap-3">
                    {relatedPosts.map((r) => (
                      <Link
                        key={r.slug}
                        href={`/activities/${r.slug}`}
                        className="block rounded-lg px-3 py-3 transition-colors hover:bg-neutral-50"
                      >
                        <time className="font-mono text-[11px] text-neutral-400">
                          {r.date}
                        </time>
                        <p className="mt-1 text-[13px] font-medium leading-snug text-neutral-700">
                          {r.title}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
