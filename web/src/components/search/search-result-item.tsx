import type { HighlightRange, SearchHit } from "@/lib/search/engine";
import { SEARCH_DOC_TYPE_LABELS } from "@/lib/search/types";

export function HighlightedText({ text, ranges }: { text: string; ranges: HighlightRange[] }) {
  if (ranges.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  ranges.forEach(([start, end], index) => {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark key={index} className="rounded-[3px] bg-amber-100 px-px text-inherit">
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <>{parts}</>;
}

function formatDate(value?: string): string | null {
  if (!value) return null;
  return value.replaceAll("-", "/");
}

export function SearchResultContent({ hit }: { hit: SearchHit }) {
  const { document, titleRanges, snippet } = hit;
  const date = formatDate(document.date);

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 rounded-full border border-border px-2 py-px font-mono text-[10px] font-medium text-neutral-600">
          {SEARCH_DOC_TYPE_LABELS[document.type]}
        </span>
        {document.parent ? (
          <span className="truncate text-[11px] text-neutral-500">{document.parent}</span>
        ) : null}
        {date ? (
          <time className="ml-auto shrink-0 font-mono text-[11px] text-neutral-400">{date}</time>
        ) : null}
      </div>
      <p className="mt-1.5 text-[14px] font-semibold tracking-tight text-neutral-950">
        <HighlightedText text={document.title} ranges={titleRanges} />
      </p>
      {snippet ? (
        <p className="mt-1 line-clamp-2 text-[12px] leading-[20px] text-neutral-600">
          <HighlightedText text={snippet.text} ranges={snippet.ranges} />
        </p>
      ) : null}
    </>
  );
}
