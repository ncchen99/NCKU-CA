import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { PublicLayout } from "@/components/layout/public-layout";
import { CmsMarkdownWithToc } from "@/components/public/cms-markdown-with-toc";
import { getSiteContent } from "@/lib/firestore/site-content";
import { normalizeLocale } from "@/lib/i18n-config";

export const revalidate = 31_536_000;

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale(await getLocale());
  const isEn = locale === "en";

  return {
    title: isEn ? "About Us" : "關於我們",
    description: isEn
      ? "Learn about the NCKU Club Association (NCA), the top student self-governance organization for clubs at NCKU."
      : "認識國立成功大學社團聯合會（NCA）——成大最高社團自治組織，致力於社團交流、資源整合與校園文化推動。",
    openGraph: {
      title: isEn ? "About Us | NCKU Club Association" : "關於我們 | 成大社聯會",
      description: isEn
        ? "Learn about the NCKU Club Association (NCA), the top student self-governance organization for clubs at NCKU."
        : "認識國立成功大學社團聯合會（NCA）——成大最高社團自治組織。",
    },
  };
}

/* 靜態 fallback 內容，當 CMS 尚未設定時使用 */
function StaticAboutContent({ isEn }: { isEn: boolean }) {
  const copy = isEn
    ? {
      sectionIntro: "Organization Overview",
      introBody:
        "The Club Association of National Cheng Kung University (NCA) is the highest student self-governance alliance for campus clubs. NCA coordinates major club affairs including evaluations, funding support, venue coordination, and cross-club events.",
      sectionMission: "Mission",
      missionBody:
        "NCA promotes collaboration among student clubs through representative assemblies, club expositions, and training programs. It also serves as a bridge between administrative units and student clubs to protect student rights.",
      sectionCore: "Core Services",
      services: [
        {
          title: "Club Expo",
          desc: "Organize a campus-wide expo each semester for club recruitment and showcase.",
        },
        {
          title: "Representative Assembly",
          desc: "Hold regular assemblies to review key proposals, budgets, and regulations.",
        },
        {
          title: "Club Evaluation",
          desc: "Run annual evaluations to support better operations and recognize excellence.",
        },
        {
          title: "Funding and Venue Coordination",
          desc: "Assist clubs with funding applications and campus venue arrangements.",
        },
        {
          title: "Leadership Training",
          desc: "Provide onboarding and management training for student club leaders.",
        },
      ],
      sectionHistory: "History",
      historyBody:
        "Founded in 1993, NCA has developed from a small alliance into a large-scale organization serving student clubs across multiple categories. Along with institutional growth, NCA continues to push digital transformation to improve governance efficiency and service quality.",
      sectionContact: "Contact",
      contacts: [
        { label: "Email", value: "nca.ncku@gmail.com" },
        {
          label: "Office",
          value: "2F, Student Activity Center, No. 1 University Rd., East Dist., Tainan City",
        },
        { label: "Office Hours", value: "Mon-Fri 10:00-17:00" },
      ],
    }
    : {
      sectionIntro: "組織介紹",
      introBody:
        "國立成功大學社團聯合會（Club Association of National Cheng Kung University，簡稱社聯會或 NCA）是成功大學校內各學生社團的最高自治聯合組織。社聯會負責統籌校內社團事務，包括社團評鑑、經費補助、場地協調及各項跨社團活動的舉辦。",
      sectionMission: "成立宗旨",
      missionBody:
        "社聯會以促進校內社團間之交流與合作為首要目標，透過定期舉辦代表大會、社團博覽會及各類培訓活動，提供社團成員學習與成長的平台。同時協助學校行政單位與學生社團之間的溝通橋樑，確保學生權益獲得充分保障。",
      sectionCore: "核心業務",
      services: [
        {
          title: "社團博覽會",
          desc: "每學期舉辦社團博覽會，提供社團招生與展示的舞台，讓新生認識多元社團。",
        },
        {
          title: "代表大會",
          desc: "定期召開代表大會，審議重要議案、預算案及社團管理辦法修正案。",
        },
        {
          title: "社團評鑑",
          desc: "辦理年度社團評鑑，鼓勵社團精進運營品質並給予優秀社團表揚。",
        },
        {
          title: "經費補助與場地協調",
          desc: "協助社團申請經費補助，並統籌校內活動場地的借用與協調。",
        },
        {
          title: "幹部培訓",
          desc: "舉辦幹部交接、經營座談等培訓活動，傳承社團經營經驗。",
        },
      ],
      sectionHistory: "歷史沿革",
      historyBody:
        "社聯會成立於 1994 年，至今已走過三十餘年的歲月。從最初僅有數十個社團的聯合組織，發展至今日涵蓋 A 類（學術性）至 H 類（聯誼性）的大型自治組織。隨著時代演進，社聯會持續推動數位轉型，建立線上平台以提升行政效率與服務品質。",
      sectionContact: "聯繫方式",
      contacts: [
        { label: "電子信箱", value: "nca.ncku@gmail.com" },
        { label: "辦公地點", value: "國立台南市東區大學路 1 號學生活動中心 2 樓社團聯合會辦公室" },
        { label: "服務時間", value: "週一至週五 10:00–17:00" },
      ],
    };

  return (
    <div className="max-w-[65ch]">
      <h2 className="text-[22px] font-[700] tracking-tight text-neutral-950">
        {copy.sectionIntro}
      </h2>
      <p className="mt-4 text-[15px] leading-[28px] text-neutral-600 text-pretty">
        {copy.introBody}
      </p>

      <h2 className="mt-14 text-[22px] font-[700] tracking-tight text-neutral-950">
        {copy.sectionMission}
      </h2>
      <p className="mt-4 text-[15px] leading-[28px] text-neutral-600 text-pretty">
        {copy.missionBody}
      </p>

      <h2 className="mt-14 text-[22px] font-[700] tracking-tight text-neutral-950">
        {copy.sectionCore}
      </h2>
      <ul className="mt-4 flex flex-col gap-3">
        {copy.services.map((item) => (
          <li
            key={item.title}
            className="rounded-lg bg-neutral-50 px-5 py-4"
          >
            <h3 className="text-[14px] font-semibold text-neutral-950">
              {item.title}
            </h3>
            <p className="mt-1 text-[13px] leading-[22px] text-neutral-600 text-pretty">
              {item.desc}
            </p>
          </li>
        ))}
      </ul>

      <h2 className="mt-14 text-[22px] font-[700] tracking-tight text-neutral-950">
        {copy.sectionHistory}
      </h2>
      <p className="mt-4 text-[15px] leading-[28px] text-neutral-600 text-pretty">
        {copy.historyBody}
      </p>

      <h2 className="mt-14 text-[22px] font-[700] tracking-tight text-neutral-950">
        {copy.sectionContact}
      </h2>
      <dl className="mt-4 flex flex-col gap-3">
        {copy.contacts.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline gap-4 border-b border-border py-3"
          >
            <dt className="w-20 shrink-0 font-mono text-[12px] font-medium text-neutral-950">
              {item.label}
            </dt>
            <dd className="text-[14px] text-neutral-600">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function AboutPage() {
  const locale = normalizeLocale(await getLocale());
  const isEn = locale === "en";

  let cmsContent: { title?: string; content_markdown?: string } | null = null;
  try {
    cmsContent = await getSiteContent("about");
  } catch {
    // CMS 未設定時使用靜態 fallback
  }

  const hasCms = Boolean(cmsContent?.content_markdown?.trim());

  return (
    <PublicLayout>
      <section className="w-full">
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-20">
          {/* Hero */}
          <div className="mb-16">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-6 border-t border-neutral-400"
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600">
                ABOUT US
              </span>
            </div>
            <h1 className="mt-4 text-[40px] font-bold leading-[1.1] tracking-tight text-neutral-950">
              {cmsContent?.title?.trim() || (isEn ? "About Us" : "關於我們")}
            </h1>
            <p className="mt-2 text-lg font-[350] text-neutral-600">
              About Club Association of NCKU
            </p>
          </div>

          {/* Content */}
          {hasCms ? (
            <CmsMarkdownWithToc markdown={cmsContent!.content_markdown!} />
          ) : (
            <StaticAboutContent isEn={isEn} />
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
