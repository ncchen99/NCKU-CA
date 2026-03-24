import type { Metadata } from "next";
import { PublicLayout } from "@/components/layout/public-layout";
import { CmsMarkdownWithToc } from "@/components/public/cms-markdown-with-toc";
import { getSiteContent } from "@/lib/firestore/site-content";

export const metadata: Metadata = {
  title: "幹部成員",
  description:
    "國立成功大學社團聯合會現任幹部成員介紹，包含會長、副會長及各部門部長。",
  openGraph: {
    title: "幹部成員 | 成大社聯會",
    description: "成大社聯會現任幹部團隊介紹。",
  },
};

interface Member {
  name: string;
  title: string;
  department?: string;
  email: string;
  initials: string;
}

const leadership: Member[] = [
  {
    name: "林承恩",
    title: "會長",
    email: "president@gs.ncku.edu.tw",
    initials: "林",
  },
  {
    name: "陳宥希",
    title: "副會長",
    email: "vp@gs.ncku.edu.tw",
    initials: "陳",
  },
];

const departments: { name: string; members: Member[] }[] = [
  {
    name: "活動部",
    members: [
      {
        name: "王柏翰",
        title: "部長",
        department: "活動部",
        email: "events@gs.ncku.edu.tw",
        initials: "王",
      },
      {
        name: "張芷萱",
        title: "副部長",
        department: "活動部",
        email: "events2@gs.ncku.edu.tw",
        initials: "張",
      },
    ],
  },
  {
    name: "公關部",
    members: [
      {
        name: "李昀蓁",
        title: "部長",
        department: "公關部",
        email: "pr@gs.ncku.edu.tw",
        initials: "李",
      },
      {
        name: "黃子晴",
        title: "副部長",
        department: "公關部",
        email: "pr2@gs.ncku.edu.tw",
        initials: "黃",
      },
    ],
  },
  {
    name: "財務部",
    members: [
      {
        name: "劉品妤",
        title: "部長",
        department: "財務部",
        email: "finance@gs.ncku.edu.tw",
        initials: "劉",
      },
    ],
  },
  {
    name: "文書部",
    members: [
      {
        name: "蔡宇翔",
        title: "部長",
        department: "文書部",
        email: "secretary@gs.ncku.edu.tw",
        initials: "蔡",
      },
    ],
  },
];

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="flex items-center gap-4 rounded-lg bg-white px-5 py-4 shadow-[0_0_0_1px_rgba(10,10,10,0.08)]">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary">
        <span className="text-[16px] font-bold text-white">
          {member.initials}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-neutral-950">
          {member.name}
        </p>
        <p className="font-mono text-[11px] text-neutral-500">
          {member.department ? `${member.department}・${member.title}` : member.title}
        </p>
        <a
          href={`mailto:${member.email}`}
          className="mt-0.5 block truncate text-[12px] text-primary hover:underline"
        >
          {member.email}
        </a>
      </div>
    </div>
  );
}

function StaticMembersContent() {
  return (
    <>
      {/* Leadership */}
      <div className="mb-14">
        <h2 className="text-[20px] font-[700] tracking-tight text-neutral-950">
          會長團
        </h2>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {leadership.map((m) => (
            <MemberCard key={m.email} member={m} />
          ))}
        </div>
      </div>

      {/* Departments */}
      {departments.map((dept) => (
        <div key={dept.name} className="mb-14">
          <h2 className="text-[20px] font-[700] tracking-tight text-neutral-950">
            {dept.name}
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dept.members.map((m) => (
              <MemberCard key={m.email} member={m} />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default async function MembersPage() {
  let cmsContent: { title?: string; content_markdown?: string } | null = null;
  try {
    cmsContent = await getSiteContent("members");
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
                TEAM
              </span>
            </div>
            <h1 className="mt-4 text-[40px] font-bold leading-[1.1] tracking-tight text-neutral-950">
              {cmsContent?.title?.trim() || "幹部成員"}
            </h1>
            <p className="mt-3 max-w-[52ch] text-[15px] leading-[28px] text-neutral-600 text-pretty">
              114 學年度社團聯合會現任幹部團隊，負責推動各項社團事務及服務。
            </p>
          </div>

          {/* Content */}
          {hasCms ? (
            <CmsMarkdownWithToc markdown={cmsContent!.content_markdown!} />
          ) : (
            <StaticMembersContent />
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
