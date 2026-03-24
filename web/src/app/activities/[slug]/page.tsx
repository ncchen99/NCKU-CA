import type { Metadata } from "next";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";

interface ActivityArticle {
  slug: string;
  category: string;
  date: string;
  author: string;
  title: string;
  content: string;
}

const articles: Record<string, ActivityArticle> = {
  "expo-27-review": {
    slug: "expo-27-review",
    category: "社博",
    date: "2025-11-20",
    author: "社聯會活動部",
    title: "113 學年第一學期社團博覽會圓滿落幕",
    content: `<p>113 學年度第一學期社團博覽會已於 11 月 18 日至 19 日在光復校區中央廣場盛大舉辦，為期兩天的活動吸引了近萬名師生到場參觀。</p>
<h3>活動概況</h3>
<p>本次社博共有超過 <strong>200 個社團</strong>參與設攤，涵蓋學術、藝術、體育、服務等多元類型。各社團發揮創意佈置攤位，透過互動遊戲、表演展示及成果海報等方式，向新生及參觀者展現社團特色。</p>
<h3>精彩亮點</h3>
<ul>
<li>開幕式邀請校長致詞，為社博揭開序幕</li>
<li>中央舞台共安排 24 場社團表演，包含熱舞、吉他、管樂等精彩演出</li>
<li>首次設置「社團體驗區」，讓參觀者直接體驗社團活動內容</li>
<li>閉幕時進行社博人氣社團票選頒獎</li>
</ul>
<h3>參與數據</h3>
<p>據統計，兩天活動共計約 9,500 人次進場，較上屆成長約 12%。線上社團簡介頁面瀏覽量突破 30,000 次。新生社團報名人數較往年增加 15%，顯示社博的招生效果顯著。</p>
<p>感謝所有參與社團的用心準備，以及工作人員的辛勞付出。下學期社博即將到來，期待更加精彩的呈現！</p>`,
  },
  "assembly-2-review": {
    slug: "assembly-2-review",
    category: "大會",
    date: "2025-12-15",
    author: "社聯會文書部",
    title: "第二次代表大會順利召開",
    content: `<p>113 學年度第一學期第二次代表大會已於 12 月 13 日下午兩點在格致堂順利召開，出席率達 87%。</p>
<h3>會議議程</h3>
<ol>
<li>主席致詞</li>
<li>前次會議紀錄確認</li>
<li>各部門工作報告</li>
<li>提案討論與表決</li>
<li>臨時動議</li>
</ol>
<h3>重要決議</h3>
<p>本次大會審議通過以下議案：</p>
<ul>
<li>113 學年度年度預算案</li>
<li>社團場地借用規範修正案</li>
<li>社團評鑑辦法部分條文修正案</li>
<li>下學期活動行事曆核定案</li>
</ul>
<p>完整會議紀錄已公告於系統中，請各社團代表查閱。下次代表大會預計於下學期初召開。</p>`,
  },
  "leadership-workshop": {
    slug: "leadership-workshop",
    category: "講座",
    date: "2025-10-08",
    author: "社聯會公關部",
    title: "社團經營分享座談會",
    content: `<p>為協助新任社團幹部順利接手社團事務，本會於 10 月 6 日舉辦社團經營分享座談會，邀請多位資深社團幹部分享經營心得。</p>
<h3>講者分享</h3>
<p>本次座談邀請了來自不同類型社團的前任負責人，分享以下主題：</p>
<ul>
<li><strong>社團招生策略</strong>——如何透過社群媒體與實體活動有效招募新成員</li>
<li><strong>財務管理實務</strong>——社團經費規劃、核銷流程與贊助洽談技巧</li>
<li><strong>團隊建立與溝通</strong>——幹部培訓、分工授權與衝突處理</li>
<li><strong>活動企劃執行</strong>——從發想到執行的完整流程與注意事項</li>
</ul>
<h3>參加回饋</h3>
<p>共計 60 位社團幹部參與，活動滿意度達 4.6/5.0。多數參加者表示座談內容對實際社團經營有很大幫助，希望未來能定期舉辦類似活動。</p>`,
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
    description: `${article.title} — 成大社聯會活動回顧`,
    openGraph: {
      title: `${article.title} | 成大社聯會`,
      description: `${article.title} — 成大社聯會活動回顧`,
    },
  };
}

const categoryBadgeColor: Record<string, string> = {
  社博: "bg-primary",
  大會: "bg-emerald-600",
  講座: "bg-amber-600",
  其他: "bg-neutral-600",
};

const relatedActivities = [
  { slug: "expo-27-review", title: "113 學年第一學期社團博覽會圓滿落幕", date: "2025-11-20" },
  { slug: "assembly-2-review", title: "第二次代表大會順利召開", date: "2025-12-15" },
  { slug: "leadership-workshop", title: "社團經營分享座談會", date: "2025-10-08" },
];

export default async function ActivityArticlePage({
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
              找不到對應的活動文章，請確認網址是否正確。
            </p>
            <Link
              href="/activities"
              className="group mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              返回活動回顧
            </Link>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const related = relatedActivities.filter((r) => r.slug !== slug).slice(0, 2);

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

              {/* Cover placeholder */}
              <div className="mb-10 aspect-[2/1] rounded-lg bg-neutral-200" />

              {/* Article content */}
              <div
                className="prose-custom max-w-[65ch]"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />

              <Link
                href="/activities"
                className="group mt-12 inline-flex items-center gap-1 text-sm font-[450] text-primary hover:underline"
              >
                <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                返回活動回顧
              </Link>
            </article>

            {/* Sidebar */}
            <aside className="hidden w-64 shrink-0 lg:block">
              <div className="sticky top-20">
                <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-neutral-950">
                  其他活動
                </h2>
                <div className="mt-4 flex flex-col gap-3">
                  {related.map((r) => (
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
          </div>
        </div>
      </section>

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
