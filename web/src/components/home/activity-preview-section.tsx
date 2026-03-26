import Link from "next/link";
import { SectionHeading, ViewAllLink } from "@/components/ui/section-heading";
import { ArrowLongRightIcon } from "@heroicons/react/20/solid";
import { getPublishedPosts } from "@/lib/firestore/posts";
import { anyTimestampToDate } from "@/lib/datetime";

function GhostTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
      {children}
    </span>
  );
}

async function ActivityPreviewSection() {
  let items: {
    slug: string;
    tag: string;
    date: string;
    title: string;
    excerpt: string;
    cover_image_url: string | null;
  }[] = [];

  try {
    const { posts } = await getPublishedPosts({
      category: "activity_review",
      limit: 3,
    });
    items = posts.map((p) => {
      const d = anyTimestampToDate(p.published_at);
      return {
        slug: p.slug,
        tag: p.tags?.[0] ?? "活動",
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
  } catch (error) {
    console.error("ActivityPreviewSection: Failed to fetch from Firestore:", error);
    /* Firestore 未連線或無資料時使用空列表 */
  }

  const featured = items[0];
  const sideCards = items.slice(1);

  return (
    <section className="w-full bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
          <SectionHeading title="活動回顧" subtitle="Activity Review" />
          <ViewAllLink href="/activities" />
        </div>

        {!featured ? (
          <div className="rounded-xl border border-border bg-white py-10 text-center text-[14px] text-neutral-500">
            尚無已發布的活動回顧。
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Featured card */}
            <Link
              href={`/activities/${featured.slug}`}
              className="group row-span-2 block overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(10,10,10,0.12),0_0_0_1px_rgba(10,10,10,0.08)]"
            >
              <article>
                <div className="h-[220px] w-full bg-neutral-200 sm:h-[260px]">
                  {featured.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featured.cover_image_url}
                      alt={featured.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2">
                    <GhostTag>{featured.tag}</GhostTag>
                    <time className="font-mono text-[11px] text-neutral-400">
                      {featured.date}
                    </time>
                  </div>
                  <h3 className="mt-3 text-[16px] font-semibold tracking-tight text-neutral-950 group-hover:text-primary transition-colors">
                    {featured.title}
                  </h3>
                  <p className="mt-2 text-[13px] leading-[22px] text-neutral-600 text-pretty">
                    {featured.excerpt}
                  </p>
                  <div className="group mt-4 inline-flex items-center gap-1 text-sm font-[450] text-primary transition-colors hover:text-primary-dark">
                    閱讀全文
                    <ArrowLongRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </div>
                </div>
              </article>
            </Link>

            {/* Side cards */}
            {sideCards.map((item) => (
              <Link
                key={item.slug}
                href={`/activities/${item.slug}`}
                className="group block h-full w-full overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(10,10,10,0.12),0_0_0_1px_rgba(10,10,10,0.08)]"
              >
                <article className="flex h-full w-full flex-col sm:flex-row sm:items-stretch">
                  <div className="relative h-[180px] w-full shrink-0 overflow-hidden bg-neutral-200 sm:h-full sm:w-[120px] sm:self-stretch">
                    {item.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col justify-center p-4">
                    <div className="flex items-center gap-2">
                      <GhostTag>{item.tag}</GhostTag>
                      <time className="font-mono text-[11px] text-neutral-400">
                        {item.date}
                      </time>
                    </div>
                    <h3 className="mt-2 text-[14px] font-semibold tracking-tight text-neutral-950 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[12px] text-neutral-600">
                      {item.excerpt}
                    </p>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export { ActivityPreviewSection };
