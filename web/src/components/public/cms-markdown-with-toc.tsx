import { extractMarkdownToc } from "@/lib/extract-markdown-toc";
import { renderMarkdownToHtml } from "@/lib/render-markdown";

interface CmsMarkdownWithTocProps {
  markdown: string;
}

export async function CmsMarkdownWithToc({ markdown }: CmsMarkdownWithTocProps) {
  const [html, toc] = await Promise.all([
    renderMarkdownToHtml(markdown),
    Promise.resolve(extractMarkdownToc(markdown)),
  ]);

  return (
    <div className="flex gap-12 lg:gap-16">
      <div className="min-w-0 flex-1">
        <div
          className="cms-markdown max-w-[65ch] text-[15px] leading-[28px] text-neutral-700"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <nav className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-20">
          <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wide text-neutral-950">
            目錄
          </h2>
          {toc.length === 0 ? (
            <p className="mt-4 text-[13px] text-neutral-500">
              請在內容中使用 ##、### 標題以產生目錄。
            </p>
          ) : (
            <ul className="mt-4 flex flex-col gap-1">
              {toc.map((item) => (
                <li key={`${item.id}-${item.text}`}>
                  <a
                    href={`#${item.id}`}
                    className={`block rounded-md px-3 py-2 text-[13px] font-[450] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-950 ${
                      item.depth === 3 ? "pl-6" : ""
                    }`}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </nav>
    </div>
  );
}
