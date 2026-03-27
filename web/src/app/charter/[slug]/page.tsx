import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicLayout } from "@/components/layout/public-layout";
import { CmsMarkdownWithToc } from "@/components/public/cms-markdown-with-toc";
import { getSiteContent } from "@/lib/firestore/site-content";
import {
  CHARTER_DOCUMENTS,
  type CharterDocumentSlug,
} from "@/lib/charter-documents";
import { buildOgImageUrl } from "@/lib/seo";
 
export const revalidate = 31_536_000;
export const dynamicParams = false;
 
type Props = { params: Promise<{ slug: string }> };

function isCharterSlug(s: string): s is CharterDocumentSlug {
  return CHARTER_DOCUMENTS.some((d) => d.slug === s);
}

export async function generateStaticParams() {
  return CHARTER_DOCUMENTS.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!isCharterSlug(slug)) return { title: "組織章程" };

  const canonicalPath = `/charter/${slug}`;
  const doc = CHARTER_DOCUMENTS.find((d) => d.slug === slug)!;
  const content = await getSiteContent(slug);
  const pageTitle = content?.title ?? doc.title;
  const ogImage = buildOgImageUrl({
    title: pageTitle,
    subtitle: "組織章程",
    path: canonicalPath,
  });

  return {
    title: pageTitle,
    description: doc.description,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title: `${pageTitle} | 成大社聯會`,
      description: doc.description,
      url: canonicalPath,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImage],
    },
  };
}

export default async function CharterDocumentPage({ params }: Props) {
  const { slug } = await params;
  if (!isCharterSlug(slug)) notFound();

  const meta = CHARTER_DOCUMENTS.find((d) => d.slug === slug)!;
  const content = await getSiteContent(slug);
  const markdown = content?.content_markdown ?? "";
  const title = content?.title?.trim() || meta.title;

  return (
    <PublicLayout>
      <section className="w-full">
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-20">
          <div className="mb-12">
            <div className="flex items-center gap-3">
              <span
                className="inline-block w-6 border-t border-neutral-400"
                aria-hidden="true"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-neutral-600">
                CHARTER
              </span>
            </div>
            <h1 className="mt-4 text-[40px] font-bold leading-[1.1] tracking-tight text-neutral-950">
              {title}
            </h1>
            <p className="mt-2 text-[14px] text-neutral-500">{meta.description}</p>

          </div>

          {!markdown.trim() ? (
            <div className="rounded-xl border border-border bg-neutral-50 px-6 py-10 text-center">
              <p className="text-[15px] text-neutral-600">
                此文件尚未於後台發布內容。請管理員至「後台 → 網站內容」建立文件 ID 為{" "}
                <code className="rounded bg-neutral-200 px-1.5 py-0.5 font-mono text-[13px]">
                  {slug}
                </code>{" "}
                的頁面，並使用 Markdown 撰寫（建議以 ##、### 作為章節標題以利目錄）。
              </p>
            </div>
          ) : (
            <CmsMarkdownWithToc markdown={markdown} />
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
