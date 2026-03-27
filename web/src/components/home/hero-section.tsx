import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

function HeroSection() {
  const t = useTranslations("home.hero");
  const stats = [
    { value: "231+", label: t("stats.clubs") },
    { value: t("stats.eventsValue"), label: t("stats.events") },
    { value: "@gs.ncku.edu.tw", label: t("stats.account") },
  ];

  return (
    <section className="w-full">
      <div className="mx-auto max-w-6xl px-4 pb-14 pt-20 sm:px-6 sm:pt-24 lg:pb-16 lg:pt-28">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:gap-16">
          {/* Left 3/5 */}
          <div className="flex w-full flex-col gap-5 lg:w-3/5 lg:gap-6">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-6 border-t border-neutral-400"
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600 sm:text-[11px]">
                {t("tagline")}
              </span>
            </div>

            <h1 className="text-[38px] font-bold leading-[1.08] tracking-[-0.03em] sm:text-[46px] lg:text-[50px]">
              {t("titleLine1")}
              <br />
              <span className="text-primary">{t("titleLine2")}</span>
            </h1>

            <p className="text-[24px] font-[350] text-neutral-600 sm:text-[28px] lg:text-[30px]">
              {t("subtitle")}
            </p>

            <div className="flex flex-row items-center gap-3 pt-1 sm:pt-2">
              <Button variant="primary" href="/about">{t("ctaAbout")}</Button>
              <Button variant="ghost" href="/news">{t("ctaNews")}</Button>
            </div>
          </div>

          {/* Right 2/5 */}
          <div className="flex w-full flex-col gap-6 lg:w-2/5 lg:gap-8">
            <p className="max-w-[40ch] text-pretty leading-7 text-neutral-600 sm:leading-[28px]">
              {t("description")}
            </p>

            <dl>
              {stats.map((stat) => (
                <div
                  key={stat.value}
                  className="flex flex-col gap-1 border-b border-border py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
                >
                  <dt className="font-mono text-sm font-semibold text-neutral-950">
                    {stat.value}
                  </dt>
                  <dd className="text-xs text-neutral-600">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}

export { HeroSection };
