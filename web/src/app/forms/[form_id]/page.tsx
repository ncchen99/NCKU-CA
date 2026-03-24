import type { Metadata } from "next";
import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { ArrowLongLeftIcon } from "@heroicons/react/20/solid";

interface MockForm {
  id: string;
  title: string;
  description: string;
  status: "open" | "closed";
  closes_at: string;
  fields: { label: string; type: string; required: boolean }[];
}

const mockForms: Record<string, MockForm> = {
  "expo-registration-2026": {
    id: "expo-registration-2026",
    title: "第 28 屆社團博覽會報名表",
    description:
      "請各社團填寫以下資料完成社博報名。報名截止時間為 2026 年 3 月 31 日 23:59。",
    status: "open",
    closes_at: "2026-03-31T23:59:00",
    fields: [
      { label: "社團名稱", type: "text", required: true },
      { label: "社團類別", type: "select", required: true },
      { label: "聯絡人姓名", type: "text", required: true },
      { label: "聯絡人 Email", type: "email", required: true },
      { label: "聯絡人手機", type: "phone", required: true },
      { label: "攤位需求說明", type: "textarea", required: false },
      { label: "是否需要用電", type: "radio", required: true },
    ],
  },
  "winter-registration": {
    id: "winter-registration",
    title: "114 學年度寒假社團聯合營報名",
    description: "社團聯合營報名已截止，感謝各社團踴躍參加。",
    status: "closed",
    closes_at: "2026-01-15T23:59:00",
    fields: [],
  },
};

const formIds = Object.keys(mockForms);

export function generateStaticParams() {
  return formIds.map((form_id) => ({ form_id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ form_id: string }>;
}): Promise<Metadata> {
  const { form_id } = await params;
  const form = mockForms[form_id];
  if (!form) {
    return { title: "表單未找到" };
  }
  return {
    title: form.title,
    description: form.description,
  };
}

const fieldTypeLabels: Record<string, string> = {
  text: "文字輸入",
  email: "電子信箱",
  phone: "電話號碼",
  select: "下拉選單",
  radio: "單選題",
  textarea: "長文字",
};

export default async function FormPage({
  params,
}: {
  params: Promise<{ form_id: string }>;
}) {
  const { form_id } = await params;
  const form = mockForms[form_id];

  if (!form) {
    return (
      <PublicLayout>
        <section className="w-full">
          <div className="mx-auto max-w-6xl px-6 py-24 text-center">
            <h1 className="text-[24px] font-bold text-neutral-950">
              表單未找到
            </h1>
            <p className="mt-2 text-neutral-600">
              找不到對應的表單，請確認連結是否正確。
            </p>
            <Link
              href="/"
              className="group mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
              返回首頁
            </Link>
          </div>
        </section>
      </PublicLayout>
    );
  }

  if (form.status === "closed") {
    return (
      <PublicLayout>
        <section className="w-full">
          <div className="mx-auto max-w-3xl px-6 pt-24 pb-20">
            <div className="rounded-xl bg-white p-8 shadow-[0_0_0_1px_rgba(10,10,10,0.08)] text-center">
              <span className="inline-flex rounded-full bg-neutral-100 px-3 py-1 font-mono text-[11px] font-medium text-neutral-600">
                已截止
              </span>
              <h1 className="mt-4 text-[24px] font-bold tracking-tight text-neutral-950">
                {form.title}
              </h1>
              <p className="mt-3 text-[14px] text-neutral-600">{form.description}</p>
              <Link
                href="/"
                className="group mt-8 inline-flex items-center gap-1 text-sm font-[450] text-primary hover:underline"
              >
                <ArrowLongLeftIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1" />
                返回首頁
              </Link>
            </div>
          </div>
        </section>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <section className="w-full">
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-20">
          {/* Form header */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 font-mono text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                開放中
              </span>
              <span className="font-mono text-[11px] text-neutral-400">
                截止：{new Date(form.closes_at).toLocaleDateString("zh-TW")}
              </span>
            </div>
            <h1 className="mt-4 text-[28px] font-bold tracking-tight text-neutral-950">
              {form.title}
            </h1>
            <p className="mt-2 max-w-[52ch] text-[14px] leading-[24px] text-neutral-600 text-pretty">
              {form.description}
            </p>
          </div>

          {/* Form fields */}
          <div className="rounded-xl bg-white p-6 shadow-[0_0_0_1px_rgba(10,10,10,0.08)]">
            <div className="flex flex-col gap-5">
              {form.fields.map((field, idx) => (
                <div key={idx}>
                  <label className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-neutral-950">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  {field.type === "textarea" ? (
                    <div className="h-24 rounded-lg border border-border bg-neutral-50 px-3 py-2">
                      <span className="text-[13px] text-neutral-400">
                        {fieldTypeLabels[field.type] ?? field.type}
                      </span>
                    </div>
                  ) : field.type === "select" ? (
                    <div className="flex h-10 items-center rounded-lg border border-border bg-neutral-50 px-3">
                      <span className="text-[13px] text-neutral-400">
                        請選擇...
                      </span>
                    </div>
                  ) : field.type === "radio" ? (
                    <div className="flex items-center gap-4 py-1">
                      {["是", "否"].map((opt) => (
                        <label
                          key={opt}
                          className="flex items-center gap-1.5 text-[13px] text-neutral-700"
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-border">
                            <span className="h-1.5 w-1.5 rounded-full" />
                          </span>
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-10 items-center rounded-lg border border-border bg-neutral-50 px-3">
                      <span className="text-[13px] text-neutral-400">
                        {fieldTypeLabels[field.type] ?? field.type}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
              <p className="text-[12px] text-neutral-400">
                請先登入後再填寫表單
              </p>
              <Link
                href="/login"
                className="inline-flex h-[38px] items-center rounded-full bg-primary px-5 text-[14px] font-[550] text-white transition-colors hover:bg-primary-light"
              >
                登入以提交
              </Link>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
