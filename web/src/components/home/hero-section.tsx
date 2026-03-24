import { Button } from "@/components/ui/button";

const stats = [
  { value: "420+", label: "學生社團（A–H 類）" },
  { value: "2 學期", label: "定期代表大會 + 社博" },
  { value: "@gs.ncku.edu.tw", label: "僅限成大校內帳號" },
];

function HeroSection() {
  return (
    <section className="w-full">
      <div className="mx-auto max-w-6xl px-6 pt-28 pb-16">
        <div className="flex items-end gap-16">
          {/* Left 3/5 */}
          <div className="flex w-3/5 flex-col gap-6">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-6 border-t border-neutral-400"
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600">
                #社團之所在#社聯之所在
              </span>
            </div>

            <h1 className="text-[50px] font-bold leading-[1.06] tracking-[-0.03em]">
              成功大學
              <br />
              <span className="text-primary">社團聯合會</span>
            </h1>

            <p className="text-[30px] font-[350] text-neutral-600">
              Club Association of NCKU
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Button variant="primary" href="/about">認識組織</Button>
              <Button variant="ghost" href="/news">最新消息</Button>
            </div>
          </div>

          {/* Right 2/5 */}
          <div className="flex w-2/5 flex-col gap-8">
            <p className="max-w-[40ch] leading-[28px] text-neutral-600 text-pretty">
              成功大學社團聯合會（Club Association of National Cheng Kung
              University，簡稱 NCA）是成大各社團與系所的最高自治組織，負責協調社團活動、代表會議及社博等重要事務。
            </p>

            <dl>
              {stats.map((stat) => (
                <div
                  key={stat.value}
                  className="flex items-baseline justify-between gap-4 border-b border-border py-3"
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
