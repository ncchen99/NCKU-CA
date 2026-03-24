import { SectionHeading, ViewAllLink } from "@/components/ui/section-heading";
import { ArrowLongRightIcon } from "@heroicons/react/20/solid";

const featured = {
  id: 1,
  tag: "社博",
  date: "2025-11-20",
  title: "113 學年第一學期社團博覽會圓滿落幕",
  excerpt:
    "本次社博共有超過 200 個社團參與，吸引近萬名新生到場。活動期間舉辦了多場精彩表演，展現成大社團的多元面貌與蓬勃活力。",
};

const sideCards = [
  {
    id: 2,
    tag: "大會",
    date: "2025-12-15",
    title: "第二次代表大會順利召開",
    excerpt: "本次大會審議通過年度預算案及多項社團管理辦法修正案。",
  },
  {
    id: 3,
    tag: "講座",
    date: "2025-10-08",
    title: "社團經營分享座談會",
    excerpt: "邀請資深社團幹部分享經營心得，提供新任幹部實用建議。",
  },
];

function GhostTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] font-medium text-neutral-600">
      {children}
    </span>
  );
}

function ActivityPreviewSection() {
  return (
    <section className="w-full bg-neutral-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex items-baseline justify-between">
          <SectionHeading title="活動回顧" subtitle="Activity Review" />
          <ViewAllLink href="/activities" />
        </div>

        <div className="grid grid-cols-2 gap-5">
          {/* Featured card — spans full left column */}
          <a
            href={`/activities/${featured.id}`}
            className="group row-span-2 block overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(10,10,10,0.12),0_0_0_1px_rgba(10,10,10,0.08)]"
          >
            <article>
              <div className="h-[260px] bg-neutral-200" />
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
          </a>

          {/* Side cards */}
          {sideCards.map((item) => (
            <a
              key={item.id}
              href={`/activities/${item.id}`}
              className="group flex overflow-hidden rounded-lg bg-white shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(10,10,10,0.12),0_0_0_1px_rgba(10,10,10,0.08)]"
            >
              <article className="flex w-full">
                <div className="w-[120px] shrink-0 bg-neutral-200" />
                <div className="flex flex-col justify-center p-4">
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
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export { ActivityPreviewSection };
