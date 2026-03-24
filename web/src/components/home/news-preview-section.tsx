import { SectionHeading, ViewAllLink } from "@/components/ui/section-heading";

const mockNews = [
  {
    id: 1,
    category: "公告",
    date: "2026-03-20",
    title: "114 學年度第二學期社團評鑑公告",
    excerpt:
      "各社團請於期限內繳交相關資料，以利評鑑作業順利進行。詳細辦法請參閱附件。",
  },
  {
    id: 2,
    category: "活動",
    date: "2026-03-15",
    title: "第 28 屆社團博覽會報名開始",
    excerpt:
      "本學期社博將於四月中旬舉辦，歡迎各社團踴躍報名參加。報名截止日期為三月底。",
  },
  {
    id: 3,
    category: "會議",
    date: "2026-03-10",
    title: "第三次代表大會會議紀錄公告",
    excerpt:
      "本次大會通過多項重要議案，請各社團代表詳閱會議紀錄並轉達社團成員。",
  },
];

function NewsPreviewSection() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex items-baseline justify-between">
          <SectionHeading title="最新消息" subtitle="Latest News" />
          <ViewAllLink href="/news" />
        </div>

        <div className="grid grid-cols-3 gap-5">
          {mockNews.map((item) => (
            <a
              key={item.id}
              href={`/news/${item.id}`}
              className="group relative block overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(10,10,10,0.12),0_0_0_1px_rgba(10,10,10,0.08)]"
            >
              <article>
                <div className="relative aspect-[16/9] bg-neutral-200">
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
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export { NewsPreviewSection };
