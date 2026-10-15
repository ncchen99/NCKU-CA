import type { Metadata } from "next";
import { PublicLayout } from "@/components/layout/public-layout";
import { SearchPageClient } from "@/components/search/search-page-client";

export const metadata: Metadata = {
  title: "搜尋",
  description: "搜尋成大社聯會的最新消息、活動回顧、法規條文與表單。",
  alternates: {
    canonical: "/search",
  },
  robots: {
    index: false,
    follow: true,
  },
};

type Props = { searchParams: Promise<{ q?: string | string[] }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const initialQuery = (Array.isArray(q) ? q[0] : q)?.slice(0, 100) ?? "";

  return (
    <PublicLayout>
      <section className="w-full">
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-20">
          <div className="mb-8">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-6 border-t border-neutral-400"
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600">
                SEARCH
              </span>
            </div>
            <h1 className="mt-4 text-[40px] font-bold leading-[1.1] tracking-tight text-neutral-950">
              全站搜尋
            </h1>
          </div>

          <SearchPageClient key={initialQuery} initialQuery={initialQuery} />
        </div>
      </section>
    </PublicLayout>
  );
}
