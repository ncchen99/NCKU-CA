import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { useTranslations } from "next-intl";
import {
  BuildingLibraryIcon,
  TicketIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

function OrgBriefSection() {
  const t = useTranslations("home.org");
  const areas = [
    {
      icon: BuildingLibraryIcon,
      title: t("areas.governanceTitle"),
      desc: t("areas.governanceDesc"),
    },
    {
      icon: TicketIcon,
      title: t("areas.expoTitle"),
      desc: t("areas.expoDesc"),
    },
    {
      icon: ClipboardDocumentCheckIcon,
      title: t("areas.resourceTitle"),
      desc: t("areas.resourceDesc"),
    },
    {
      icon: UserGroupIcon,
      title: t("areas.venueTitle"),
      desc: t("areas.venueDesc"),
    },
  ];

  return (
    <section className="w-full bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <SectionHeading
          title={t("title")}
          subtitle={t("subtitle")}
          className="mb-12"
        />

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left — Mission */}
          <div className="flex flex-col gap-8">
            <div className="max-w-[52ch] space-y-5 text-pretty leading-7 text-neutral-600 sm:leading-[28px]">
              <p>{t("paragraph1")}</p>
              <p>{t("paragraph2")}</p>
            </div>
            <div className="flex flex-row items-center gap-3">
              <Button variant="primary" href="/about">{t("readMore")}</Button>
              <Button variant="ghost" href="/charter/charter">{t("charter")}</Button>
            </div>
          </div>

          {/* Right — Focus areas */}
          <div className="flex flex-col">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
