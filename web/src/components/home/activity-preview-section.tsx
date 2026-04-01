import Link from "next/link";
import { SectionHeading, ViewAllLink } from "@/components/ui/section-heading";
import { getPublishedPosts } from "@/lib/firestore/posts";
import { anyTimestampToDate } from "@/lib/datetime";

function GhostTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="-ml-1 rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
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
      limit: 4,
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
  const isFourPlusLayout = items.length >= 4;
  const sideCards = isFourPlusLayout ? items.slice(1, 4) : items.slice(1, 3);
  const sideCardRows = isFourPlusLayout ? 3 : sideCards.length >= 2 ? 2 : 1;
  const rightGridRowsClass =
    sideCardRows === 3
      ? "lg:grid-rows-3"
      : sideCardRows === 2
        ? "lg:grid-rows-2"
        : "lg:grid-rows-1";
  const sideCardHeightClass =
    sideCardRows === 3
      ? "lg:h-[146px]"
      : sideCardRows === 2
        ? "lg:h-[180px]"
        : "lg:h-[162px]";
  const featuredHeightClass =
    sideCardRows === 3
      ? "lg:h-[calc(146px*3+1rem*2)]"
      : sideCardRows === 2
        ? "lg:h-[calc(180px*2+1rem)]"
        : "lg:h-[162px]";
  const featuredImageHeightClass =
    sideCardRows === 3
      ? "lg:h-[250px]"
      : sideCardRows === 2
        ? "lg:h-[210px]"
        : "lg:h-[170px]";
  const featuredExcerptClampClass =
    sideCardRows === 2 ? "lg:line-clamp-2" : "lg:line-clamp-4";

  return (
    <section className="w-full bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <SectionHeading title="活動回顧" subtitle="Activity Review" />
          <ViewAllLink href="/activities" />
        </div>

        {!featured ? (
          <div className="rounded-xl border border-border bg-white py-10 text-center text-[14px] text-neutral-500">
            尚無已發布的活動回顧。
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Featured card */}
            <Link
              href={`/activities/${featured.slug}`}
              className={`group block overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(10,10,10,0.12),0_0_0_1px_rgba(10,10,10,0.08)] ${featuredHeightClass}`}
            >
              <article className="flex h-full flex-col">
                <div className={`h-[220px] w-full bg-neutral-200 sm:h-[260px] ${featuredImageHeightClass}`}>
                  {featured.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featured.cover_image_url}
                      alt={featured.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-end bg-gradient-to-br from-neutral-200 via-neutral-100 to-white p-4">
                      <span className="font-mono text-[10px] tracking-wide text-neutral-500">
                        ACTIVITY REVIEW
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex min-h-0 flex-1 flex-col p-6">
                  <div className="flex items-center gap-2">
                    <GhostTag>{featured.tag}</GhostTag>
                    <time className="font-mono text-[11px] text-neutral-400">
                      {featured.date}
                    </time>
                  </div>
                  <h3 className="mt-2 line-clamp-2 text-[16px] font-semibold tracking-tight text-neutral-950 transition-colors group-hover:text-primary">
                    {featured.title}
                  </h3>
                  <p className={`mt-1.5 line-clamp-4 text-[13px] leading-[21px] text-neutral-600 text-pretty ${featuredExcerptClampClass}`}>
                    {featured.excerpt}
                  </p>
                </div>
              </article>
            </Link>

            {/* Side cards */}
            <div className={`grid h-full gap-4 ${rightGridRowsClass}`}>
              {sideCards.map((item) => (
                <Link
                  key={item.slug}
                  href={`/activities/${item.slug}`}
                  className={`group block w-full overflow-hidden rounded-xl bg-white shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(10,10,10,0.12),0_0_0_1px_rgba(10,10,10,0.08)] ${sideCardHeightClass}`}
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
                      ) : (
                        <div className="absolute inset-0 flex items-end bg-gradient-to-br from-neutral-200 via-neutral-100 to-white p-3">
                          <span className="font-mono text-[10px] tracking-wide text-neutral-500">
                            ACTIVITY REVIEW
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col justify-center p-6">
                      <div className="flex items-center gap-2">
                        <GhostTag>{item.tag}</GhostTag>
                        <time className="font-mono text-[11px] text-neutral-400">
                          {item.date}
                        </time>
                      </div>
                      <h3 className="mt-1.5 text-[14px] font-semibold tracking-tight text-neutral-950 transition-colors group-hover:text-primary">
                        {item.title}
                      </h3>
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-neutral-600">
                        {item.excerpt}
                      </p>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export { ActivityPreviewSection };
