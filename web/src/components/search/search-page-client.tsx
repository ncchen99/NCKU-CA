"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { SEARCH_DOC_TYPE_LABELS, type SearchDocType } from "@/lib/search/types";
import { SearchResultContent } from "./search-result-item";
import { isImeKeyEvent, useImeSafeQuery } from "./use-ime-safe-query";
import { useSiteSearch } from "./use-site-search";
import { saveRecentSearch } from "./recent-searches";

const PAGE_SIZE = 20;
const ALL_TYPES = "all";
const TYPE_ORDER: SearchDocType[] = ["news", "activity", "charter", "form", "page"];

type TypeFilter = SearchDocType | typeof ALL_TYPES;

export function SearchPageClient({ initialQuery }: { initialQuery: string }) {
  const { value, query, reset, inputProps } = useImeSafeQuery(initialQuery);
  const { status, result, retry } = useSiteSearch(query);
  const trimmedQuery = query.trim();
  // 篩選與分頁綁定查詢字串：查詢改變時回到「全部」與第一頁
  const [view, setView] = useState<{ query: string; type: TypeFilter; count: number }>({
    query: trimmedQuery,
    type: ALL_TYPES,
    count: PAGE_SIZE,
  });
  const isCurrentView = view.query === trimmedQuery;
  const typeFilter = isCurrentView ? view.type : ALL_TYPES;
  const visibleCount = isCurrentView ? view.count : PAGE_SIZE;
  const setTypeFilter = (type: TypeFilter) => setView({ query: trimmedQuery, type, count: PAGE_SIZE });
  const showMore = () => setView({ query: trimmedQuery, type: typeFilter, count: visibleCount + PAGE_SIZE });

  // 查詢字串同步到網址，方便分享或重新整理
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (trimmedQuery) {
      params.set("q", trimmedQuery);
    } else {
      params.delete("q");
    }
    const search = params.toString();
    const href = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    if (href !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, "", href);
    }
  }, [trimmedQuery]);

  const typeCounts = useMemo(() => {
    const counts = new Map<SearchDocType, number>();
    for (const hit of result.hits) {
      counts.set(hit.document.type, (counts.get(hit.document.type) ?? 0) + 1);
    }
    return counts;
  }, [result.hits]);

  const filteredHits = useMemo(
    () => (typeFilter === ALL_TYPES ? result.hits : result.hits.filter((hit) => hit.document.type === typeFilter)),
    [result.hits, typeFilter],
  );
  const visibleHits = filteredHits.slice(0, visibleCount);

  return (
    <>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmedQuery) saveRecentSearch(trimmedQuery);
        }}
        className="flex h-12 items-center gap-3 rounded-full px-4 ring-1 ring-neutral-950/12 focus-within:ring-2 focus-within:ring-primary/40"
      >
        <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden />
        <input
          {...inputProps}
          type="search"
          name="q"
          aria-label="搜尋關鍵字"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
          maxLength={100}
          autoFocus={!initialQuery}
          placeholder="搜尋公告、活動、法規條文…"
          onKeyDown={(event) => {
            if (isImeKeyEvent(event)) return;
            if (event.key === "Escape" && value) {
              event.preventDefault();
              reset();
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-[16px] text-neutral-950 outline-none placeholder:text-neutral-400 [&::-webkit-search-cancel-button]:hidden"
        />
        {value ? (
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="清除搜尋文字"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        ) : null}
      </form>

      <div className="mt-8" aria-live="polite">
        {!trimmedQuery ? (
          <p className="text-[14px] leading-[26px] text-neutral-600">
            輸入關鍵字搜尋最新消息、活動回顧、法規條文與開放中的表單。
            支援繁簡體互通，多個關鍵字請用空格分隔，條號可輸入「第17條」或「第十七條」。
          </p>
        ) : status === "error" ? (
          <div className="rounded-xl border border-border bg-neutral-50 py-12 text-center">
            <p className="text-[14px] text-neutral-600">搜尋暫時無法使用，請稍後再試。</p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-neutral-700 ring-1 ring-neutral-950/8 hover:bg-neutral-50"
            >
              重新載入
            </button>
          </div>
        ) : status !== "ready" ? (
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-neutral-500">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            正在載入搜尋資料…
          </div>
        ) : result.hits.length === 0 ? (
          <div className="rounded-xl border border-border bg-neutral-50 py-12 text-center">
            <p className="text-[14px] text-neutral-700">找不到「{trimmedQuery}」的相關結果</p>
            <p className="mt-2 text-[12px] text-neutral-500">試試較短的關鍵字，或用空格分隔多個關鍵字。</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <FilterChip
                active={typeFilter === ALL_TYPES}
                onClick={() => setTypeFilter(ALL_TYPES)}
                label="全部"
                count={result.hits.length}
              />
              {TYPE_ORDER.filter((type) => typeCounts.has(type)).map((type) => (
                <FilterChip
                  key={type}
                  active={typeFilter === type}
                  onClick={() => setTypeFilter(type)}
                  label={SEARCH_DOC_TYPE_LABELS[type]}
                  count={typeCounts.get(type) ?? 0}
                />
              ))}
            </div>

            {result.partial ? (
              <p className="mt-4 text-[12px] text-neutral-500">
                沒有完全符合「{trimmedQuery}」的結果，以下為部分符合：
              </p>
            ) : null}

            <ul className="mt-5 divide-y divide-border rounded-xl ring-1 ring-neutral-950/8">
              {visibleHits.map((hit) => (
                <li key={hit.document.id}>
                  <Link
                    href={hit.document.url}
                    onClick={() => saveRecentSearch(trimmedQuery)}
                    className="block px-4 py-3.5 transition-colors hover:bg-neutral-50"
                  >
                    <SearchResultContent hit={hit} />
                  </Link>
                </li>
              ))}
            </ul>

            {filteredHits.length > visibleCount ? (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={showMore}
                  className="rounded-full px-5 py-2 text-[13px] font-medium text-neutral-700 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50"
                >
                  顯示更多（還有 {filteredHits.length - visibleCount} 筆）
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-[500] transition-colors ${active
        ? "bg-primary text-white"
        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
        }`}
    >
      {label}
      <span className={`font-mono text-[11px] ${active ? "text-white/70" : "text-neutral-400"}`}>{count}</span>
    </button>
  );
}
