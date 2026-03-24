import type { Metadata } from "next";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";

interface NewsArticle {
  slug: string;
  category: string;
  date: string;
  author: string;
  title: string;
  content: string;
}

const articles: Record<string, NewsArticle> = {
  "club-evaluation-2026": {
    slug: "club-evaluation-2026",
    category: "公告",
    date: "2026-03-20",
    author: "社聯會文書部",
    title: "114 學年度第二學期社團評鑑公告",
    content: `<p>各社團您好：</p>
<p>依據本會社團評鑑辦法，本學期社團評鑑作業將於即日起展開。請各社團於 <strong>2026 年 4 月 15 日</strong>前繳交下列資料：</p>
<h3>繳交資料</h3>
<ol>
<li>社團年度活動成果報告書</li>
<li>社團財務收支明細表</li>
<li>社團幹部名冊及異動紀錄</li>
<li>社團未來一年活動規劃書</li>
</ol>
<h3>評鑑標準</h3>
<p>本次評鑑將由評鑑委員會依據以下面向進行評分：</p>
<ul>
<li>組織運作與管理（30%）</li>
<li>活動辦理成效（30%）</li>
<li>財務管理透明度（20%）</li>
<li>社團發展規劃（20%）</li>
</ul>
<p>評鑑結果將作為下學期社團經費補助之重要參考依據。如有任何疑問，請洽本會文書部。</p>`,
  },
  "expo-registration-2026": {
    slug: "expo-registration-2026",
    category: "活動",
    date: "2026-03-15",
    author: "社聯會活動部",
    title: "第 28 屆社團博覽會報名開始",
    content: `<p>第 28 屆社團博覽會即將於 <strong>2026 年 4 月 16 日至 4 月 17 日</strong>在光復校區中央廣場盛大舉辦！</p>
<h3>活動資訊</h3>
<ul>
<li>日期：2026/04/16（三）～ 04/17（四）</li>
<li>時間：10:00 – 17:00</li>
<li>地點：光復校區中央廣場</li>
</ul>
<h3>報名方式</h3>
<p>請各社團於 <strong>2026 年 3 月 31 日</strong>前至本會線上表單系統完成報名。每個社團可申請一個標準攤位，如需加大攤位請另行申請。</p>
<p>報名成功後將於四月初公告攤位配置圖，届時會寄送詳細注意事項至各社團聯絡信箱。</p>
<p>歡迎各社團踴躍參加，一同展現成大社團的多元風貌！</p>`,
  },
  "meeting-minutes-3": {
    slug: "meeting-minutes-3",
    category: "重要",
    date: "2026-03-10",
    author: "社聯會文書部",
    title: "第三次代表大會會議紀錄公告",
    content: `<p>114 學年度第二學期第三次代表大會已於 2026 年 3 月 8 日順利召開，以下為重點摘要：</p>
<h3>通過議案</h3>
<ol>
<li>114 學年度第二學期社團經費補助分配案</li>
<li>社團博覽會籌備計畫案</li>
<li>社團評鑑辦法修正案</li>
<li>場地借用規範更新案</li>
</ol>
<h3>報告事項</h3>
<ul>
<li>上學期社團評鑑結果報告</li>
<li>財務部期中收支報告</li>
<li>各部門工作進度報告</li>
</ul>
<p>完整會議紀錄已上傳至系統，請各社團代表詳閱並將重要決議事項轉達社團成員。如對決議內容有任何疑義，請於兩週內以書面方式向本會提出。</p>`,
  },
};

const articleSlugs = Object.keys(articles);

export function generateStaticParams() {
  return articleSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug];
  if (!article) {
    return { title: "文章未找到" };
  }
  return {
    title: article.title,
    description: `${article.title} — 成大社聯會最新消息`,
    openGraph: {
      title: `${article.title} | 成大社聯會`,
      description: `${article.title} — 成大社聯會最新消息`,
    },
  };
}

const categoryBadgeColor: Record<string, string> = {
  公告: "bg-primary",
  活動: "bg-emerald-600",
  重要: "bg-red-600",
};

const relatedArticles = [
  { slug: "club-evaluation-2026", title: "114 學年度第二學期社團評鑑公告", date: "2026-03-20" },
  { slug: "expo-registration-2026", title: "第 28 屆社團博覽會報名開始", date: "2026-03-15" },
  { slug: "meeting-minutes-3", title: "第三次代表大會會議紀錄公告", date: "2026-03-10" },
];

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles[slug];

  if (!article) {
    return (
      <PublicLayout>
        <section className="w-full">
          <div className="mx-auto max-w-6xl px-6 py-24 text-center">
            <h1 className="text-[24px] font-bold text-neutral-950">
              文章未找到
            </h1>
            <p className="mt-2 text-neutral-600">
              找不到對應的文章，請確認網址是否正確。
            </p>
            <Link
              href="/news"
              className="group mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              返回最新消息
            </Link>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const related = relatedArticles.filter((r) => r.slug !== slug).slice(0, 2);

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
              href="/news"
              className="text-neutral-500 transition-colors hover:text-neutral-950"
            >
              最新消息
            </Link>
            <span className="text-neutral-400">/</span>
            <span className="truncate text-neutral-950">{article.title}</span>
          </nav>

          <div className="flex gap-12 lg:gap-16">
            {/* Main content */}
            <article className="min-w-0 flex-1">
              {/* Article header */}
              <div className="mb-10">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 font-mono text-[10px] font-medium text-white ${categoryBadgeColor[article.category] ?? "bg-neutral-600"}`}
                >
                  {article.category}
                </span>
                <h1 className="mt-4 text-[32px] font-bold leading-[1.15] tracking-tight text-neutral-950">
                  {article.title}
                </h1>
                <div className="mt-3 flex items-center gap-3">
                  <time className="font-mono text-[12px] text-neutral-400">
                    {article.date}
                  </time>
                  <span className="h-3.5 w-px bg-neutral-200" aria-hidden />
                  <span className="text-[12px] text-neutral-500">
                    {article.author}
                  </span>
                </div>
              </div>

              {/* Article content */}
              <div
                className="prose-custom max-w-[65ch]"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              <Link
                href="/news"
                className="group mt-12 inline-flex items-center gap-1 text-sm font-[450] text-primary hover:underline"
              >
                <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                返回最新消息
              </Link>
            </article>

            {/* Sidebar */}
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="sticky top-20">
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-neutral-950">
                  相關文章
                </h2>
                <div className="mt-4 flex flex-col gap-3">
                  {related.map((r) => (
                    <Link
                      key={r.slug}
                      href={`/news/${r.slug}`}
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
          </div>
        </div>
      </section>

      {/* Prose-custom styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .prose-custom { color: #404040; font-size: 15px; line-height: 28px; }
            .prose-custom h3 { font-size: 18px; font-weight: 700; color: #0a0a0a; margin-top: 28px; margin-bottom: 12px; letter-spacing: -0.01em; }
            .prose-custom p { margin-bottom: 16px; }
            .prose-custom ul, .prose-custom ol { margin-bottom: 16px; padding-left: 24px; }
            .prose-custom li { margin-bottom: 6px; }
            .prose-custom strong { font-weight: 600; color: #0a0a0a; }
          `,
        }}
      />
    </PublicLayout>
  );
}
