import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  BuildingLibraryIcon,
  TicketIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

const areas = [
  {
    icon: BuildingLibraryIcon,
    title: "組織治理",
    desc: "代表大會、主席團與行政團隊分工運作",
  },
  { icon: TicketIcon, title: "社博管理", desc: "每學期社團博覽會策劃執行" },
  {
    icon: ClipboardDocumentCheckIcon,
    title: "資源與財務",
    desc: "會費、預決算與社團會產租借管理",
  },
  { icon: UserGroupIcon, title: "場地協調", desc: "學生活動中心與芸青軒場地管理" },
];

function OrgBriefSection() {
  return (
    <section className="w-full bg-neutral-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <SectionHeading
          title="關於組織"
          subtitle="About Club Association of NCKU"
          className="mb-12"
        />

        <div className="grid grid-cols-2 gap-16">
          {/* Left — Mission */}
          <div className="flex flex-col gap-8">
            <div className="max-w-[52ch] space-y-5 leading-[28px] text-neutral-600 text-pretty">
              <p>
                成功大學社團聯合會（Club Association of National Cheng Kung University，簡稱 NCA）成立於 1994
                年，目前共有 231 個社團。我們是校內社團的自治聯合組織，負責協調共同事務、整合資源並維護社團權益。
              </p>
              <p>
                社聯會由正副會長、行政團隊、六性質主席團與顧問團共同運作，並透過社團代表大會與性質會議推動決策，執行社團博覽會、場地協調與財務管理等核心業務。
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" href="/about">閱讀更多</Button>
              <Button variant="ghost" href="/charter/charter">組織章程</Button>
            </div>
          </div>

          {/* Right — Focus areas */}
          <div className="flex flex-col">
            <div className="grid grid-cols-2 gap-4">
              {areas.map((area) => (
                <div
                  key={area.title}
                  className="flex flex-col gap-4 rounded-xl bg-white p-5 shadow-[0_0_0_1px_rgba(10,10,10,0.08)]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <area.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-[14px] font-bold text-neutral-950">
                      {area.title}
                    </h4>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">
                      {area.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export { OrgBriefSection };
