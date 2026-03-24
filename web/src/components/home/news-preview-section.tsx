import Link from "next/link";
import { SectionHeading, ViewAllLink } from "@/components/ui/section-heading";
import { getPublishedPosts } from "@/lib/firestore/posts";
import { anyTimestampToDate } from "@/lib/datetime";

async function NewsPreviewSection() {
  let news: {
    slug: string;
    category: string;
    date: string;
    title: string;
    excerpt: string;
    cover_image_url: string | null;
  }[] = [];

  try {
    const { posts } = await getPublishedPosts({ category: "news", limit: 3 });
    news = posts.map((p) => {
      const d = anyTimestampToDate(p.published_at);
      return {
        slug: p.slug,
        category: p.tags?.[0] ?? "公告",
        date: d
          ? d.toLocaleDateString("zh-TW", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })
          : "—",
        title: p.title,
        excerpt:
          p.content_markdown
            ?.substring(0, 120)
            ?.replace(/[#*_>\-\[\]`]/g, "") ?? "",
        cover_image_url: p.cover_image_url || null,
      };
    });
  } catch {
    /* Firestore 未連線或無資料時使用空列表 */
  }

  if (news.length === 0) {
    // Fallback mock data
    news = [
      {
        slug: "#",
        category: "公告",
        date: "—",
        title: "尚無已發布消息",
        excerpt: "管理員可在後台新增最新消息文章。",
        cover_image_url: null,
      },
    ];
  }

  return (
    <section className="w-full">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex items-baseline justify-between">
          <SectionHeading title="最新消息" subtitle="Latest News" />
          <ViewAllLink href="/news" />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <Link
              key={item.slug}
              href={item.slug === "#" ? "/news" : `/news/${item.slug}`}
              className="group relative block overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(10,10,10,0.12),0_0_0_1px_rgba(10,10,10,0.08)]"
            >
              <article>
                <div className="relative aspect-[16/9] bg-neutral-200">
                  {item.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.cover_image_url}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 font-mono text-[10px] font-medium text-white">
                    {item.category}
                  </span>
                </div>
                <div className="bg-white p-4">
                  <time className="font-mono text-[11px] text-neutral-400">
                    {item.date}
                  </time>
                  <h3 className="mt-2 text-[14px] font-semibold tracking-tight text-neutral-950 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[12px] text-neutral-600">
                    {item.excerpt}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export { NewsPreviewSection };
