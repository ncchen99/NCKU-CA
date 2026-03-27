import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { PublicLayout } from "@/components/layout/public-layout";
import { getPublicFormById, getPublicFormIds } from "@/lib/firestore/forms";
import { anyTimestampToDate } from "@/lib/datetime";
import { buildOgImageUrl } from "@/lib/seo";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";
import { FormClient } from "./form-client";
import { normalizeLocale } from "@/lib/i18n-config";

export const revalidate = 31_536_000;
export const dynamicParams = true;

type Props = { params: Promise<{ form_id: string }> };

export async function generateStaticParams() {
  try {
    const formIds = await getPublicFormIds();
    return formIds.map((form_id) => ({ form_id }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = normalizeLocale(await getLocale());
  const isEn = locale === "en";
  const { form_id } = await params;
  const canonicalPath = `/forms/${form_id}`;
  try {
    const form = await getPublicFormById(form_id);
    if (!form) return { title: isEn ? "Form Not Found" : "表單未找到" };
    const description =
      form.description?.substring(0, 160) ??
      (isEn ? "NCKU Club Association online form" : "社聯會線上表單");
    const ogImage = buildOgImageUrl({
      title: form.title,
      subtitle: isEn ? "Online Form" : "線上表單",
      path: canonicalPath,
    });

    return {
      title: form.title,
      description,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title: `${form.title} | ${isEn ? "NCKU Club Association" : "成大社聯會"}`,
        description,
        url: canonicalPath,
        images: [ogImage],
      },
      twitter: {
        card: "summary_large_image",
        images: [ogImage],
      },
    };
  } catch {
    return { title: isEn ? "Form Not Found" : "表單未找到" };
  }
}

export default async function FormPage({ params }: Props) {
  const locale = normalizeLocale(await getLocale());
  const isEn = locale === "en";
  const { form_id } = await params;

  let form;
  try {
    form = await getPublicFormById(form_id);
  } catch {
    form = null;
  }

  if (!form) {
    return (
      <PublicLayout>
        <section className="w-full">
          <div className="mx-auto max-w-6xl px-6 py-24 text-center">
            <h1 className="text-[24px] font-bold text-neutral-950">
              {isEn ? "Form Not Found" : "表單未找到"}
            </h1>
            <p className="mt-2 text-neutral-600">
              {isEn
                ? "We could not find this form. Please check the link and try again."
                : "找不到對應的表單，請確認連結是否正確。"}
            </p>
            <Link
              href="/"
              className="group mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              {isEn ? "Back to Home" : "返回首頁"}
            </Link>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const closesAt = anyTimestampToDate(form.closes_at);
  const isClosed = form.status === "closed" || (closesAt && closesAt < new Date());
  const closesAtStr = closesAt
    ? new Intl.DateTimeFormat(isEn ? "en" : "zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(closesAt)
    : "";

  if (isClosed) {
    return (
      <PublicLayout>
        <section className="w-full">
          <div className="mx-auto max-w-3xl px-6 pt-24 pb-20">
            <div className="rounded-xl bg-white p-8 shadow-[0_0_0_1px_rgba(10,10,10,0.08)] text-center">
              <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 font-mono text-[11px] font-medium text-neutral-600">
                {isEn ? "Closed" : "已截止"}
              </span>
              <h1 className="mt-4 text-[24px] font-bold tracking-tight text-neutral-950">
                {form.title}
              </h1>
              <p className="mt-3 text-[14px] text-neutral-600">{form.description}</p>
              {closesAt && (
                <p className="mt-2 text-[13px] text-neutral-500">
                  {isEn ? "Deadline: " : "截止時間："}
                  {closesAtStr}
                </p>
              )}
              <Link
                href="/"
                className="group mt-8 inline-flex items-center gap-1 text-sm font-[450] text-primary hover:underline"
              >
                <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                {isEn ? "Back to Home" : "返回首頁"}
              </Link>
            </div>
          </div>
        </section>
      </PublicLayout>
    );
  }

  const sortedFields = [...(form.fields ?? [])].sort((a, b) => a.order - b.order);

  return (
    <PublicLayout>
      <section className="w-full">
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-20">
          {/* Form header */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 font-mono text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                {isEn ? "Open" : "開放中"}
              </span>
              {closesAt && (
                <span className="font-mono text-[11px] text-neutral-400">
                  {isEn ? "Deadline: " : "截止："}
                  {closesAtStr}
                </span>
              )}
            </div>
            <h1 className="mt-4 text-[28px] font-bold tracking-tight text-neutral-950">
              {form.title}
            </h1>
            <p className="mt-2 w-full text-[14px] leading-[24px] text-neutral-600 text-pretty">
              {form.description}
            </p>
            {form.deposit_policy?.required && form.deposit_policy.amount && (
              <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-[13px] font-medium text-neutral-900">
                  {isEn ? "This form requires a deposit: NT$ " : "本表單需繳交保證金 NT$ "}
                  {form.deposit_policy.amount.toLocaleString()}
                </p>
                {form.deposit_policy.refund_rule && (
                  <p className="mt-1 text-[12px] text-neutral-600">{form.deposit_policy.refund_rule}</p>
                )}
              </div>
            )}
          </div>

          {/* Interactive form */}
          <FormClient formId={form_id} fields={sortedFields} />
        </div>
      </section>
    </PublicLayout>
  );
}
