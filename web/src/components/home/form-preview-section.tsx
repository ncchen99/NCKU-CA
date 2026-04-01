import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { getOpenForms } from "@/lib/firestore/forms";
import { anyTimestampToDate } from "@/lib/datetime";
import { DocumentTextIcon, ArrowLongRightIcon } from "@heroicons/react/24/outline";
import type { Form } from "@/types";

export async function FormPreviewSection({ preFetchedForms }: { preFetchedForms?: Form[] }) {
  let formsData = preFetchedForms;

  if (!formsData) {
    try {
      formsData = await getOpenForms();
    } catch (error) {
      console.error("FormPreviewSection: Failed to fetch forms", error);
      formsData = [];
    }
  }

  const forms = formsData.map((f) => {
    const closesAt = anyTimestampToDate(f.closes_at);
    return {
      id: f.id,
      title: f.title,
      description: f.description || "",
      closesAt: closesAt
        ? closesAt.toLocaleDateString("zh-TW", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        : "無期限",
    };
  });

  if (forms.length === 0) {
    return null;
  }

  return (
    <section className="w-full bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-baseline sm:justify-between">
          <SectionHeading title="表單專區" subtitle="Open Forms" />
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Link
              key={form.id}
              href={`/forms/${form.id}`}
              className="group relative flex flex-col justify-between overflow-hidden rounded-xl bg-white p-6 shadow-[0_0_0_1px_rgba(10,10,10,0.08)] transition-all hover:shadow-[0_4px_12px_-2px_rgba(10,10,10,0.12),0_0_0_1px_rgba(10,10,10,0.08)]"
            >
              <div>
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <DocumentTextIcon className="h-5 w-5" />
                </div>
                <h3 className="text-[14px] font-semibold tracking-tight text-neutral-950 group-hover:text-primary transition-colors">
                  {form.title}
                </h3>
                <p className="mt-2 line-clamp-2 text-[12px] leading-[22px] text-neutral-600">
                  {form.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <span className="text-[11px] font-medium text-neutral-400">
                  截止日期：{form.closesAt}
                </span>
                <span className="flex items-center gap-1 text-[13px] font-[550] text-primary">
                  前往填寫 <ArrowLongRightIcon className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );

}
