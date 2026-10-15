"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRightIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { CHARTER_DOCUMENTS } from "@/lib/charter-documents";
import { SearchResultContent } from "./search-result-item";
import { isImeKeyEvent, useImeSafeQuery } from "./use-ime-safe-query";
import { loadSiteSearchIndex, useSiteSearch } from "./use-site-search";
import { clearRecentSearches, readRecentSearches, saveRecentSearch } from "./recent-searches";

const MAX_DIALOG_RESULTS = 12;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable
    || target.tagName === "INPUT"
    || target.tagName === "TEXTAREA"
    || target.tagName === "SELECT";
}

export function buildSearchPageHref(query: string): string {
  const trimmed = query.trim();
  return trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
}

/** 預先下載索引（滑鼠移到搜尋按鈕上時呼叫），打開時即可立即搜尋 */
export function prefetchSiteSearch() {
  loadSiteSearchIndex().catch(() => {
    // 開啟搜尋時會再重試並顯示錯誤
  });
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  // 全域快捷鍵：⌘K / Ctrl+K 切換，「/」開啟
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (!open && event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isEditableTarget(event.target)) {
        event.preventDefault();
        onOpenChange(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return null;
  return createPortal(<SearchDialogPanel onClose={() => onOpenChange(false)} />, document.body);
}

function SearchDialogPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const { value, query, reset, inputProps } = useImeSafeQuery();
  const { status, result, retry } = useSiteSearch(query);
  // 選取位置綁定查詢字串：查詢改變時自動回到第一筆
  const [selection, setSelection] = useState({ query, index: 0 });
  const activeIndex = selection.query === query ? selection.index : 0;
  const setActiveIndex = useCallback((index: number) => setSelection({ query, index }), [query]);
  const [recent, setRecent] = useState<string[]>(readRecentSearches);

  const trimmedQuery = query.trim();
  const hits = result.hits.slice(0, MAX_DIALOG_RESULTS);
  const selectedIndex = Math.min(activeIndex, Math.max(0, hits.length - 1));

  useEffect(() => {
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // 焦點不在輸入框時（例如點了結果區域）也能用 Esc 關閉
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented && !event.isComposing) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.getElementById(`${listboxId}-${selectedIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, listboxId]);

  const navigate = useCallback((href: string) => {
    if (trimmedQuery) saveRecentSearch(trimmedQuery);
    onClose();
    router.push(href);
  }, [onClose, router, trimmedQuery]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (isImeKeyEvent(event)) return;

    if (event.key === "Escape") {
      event.preventDefault();
      if (value) {
        reset();
      } else {
        onClose();
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (hits.length === 0) return;
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((selectedIndex + delta + hits.length) % hits.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const hit = hits[selectedIndex];
      if (hit) {
        navigate(hit.document.url);
      } else if (trimmedQuery) {
        navigate(buildSearchPageHref(trimmedQuery));
      }
    }
  };

  const activeOptionId = hits[selectedIndex] ? `${listboxId}-${selectedIndex}` : undefined;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 sm:px-4 sm:pt-[10vh]">
      <button
        type="button"
        aria-label="關閉搜尋"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="全站搜尋"
        className="relative flex h-full w-full flex-col overflow-hidden bg-white sm:h-auto sm:max-h-[min(640px,80vh)] sm:max-w-2xl sm:rounded-xl sm:shadow-[0_0_0_1px_rgba(10,10,10,0.10),0_8px_40px_rgba(10,10,10,0.16)]"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-neutral-400" aria-hidden />
          <input
            ref={inputRef}
            {...inputProps}
            type="search"
            role="combobox"
            aria-expanded={hits.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            maxLength={100}
            placeholder="搜尋公告、活動、法規條文…"
            onKeyDown={handleKeyDown}
            className="h-16 min-w-0 flex-1 bg-transparent text-[16px] sm:h-14 text-neutral-950 outline-none placeholder:text-neutral-400 [&::-webkit-search-cancel-button]:hidden"
          />
          {value ? (
            <button
              type="button"
              onClick={() => {
                reset();
                inputRef.current?.focus();
              }}
              className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              aria-label="清除搜尋文字"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 shrink-0 items-center rounded-full px-3 text-[13px] text-neutral-600 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50 sm:hidden"
          >
            取消
          </button>
          <kbd className="hidden rounded-md px-1.5 py-0.5 font-mono text-[11px] text-neutral-400 ring-1 ring-neutral-950/8 sm:inline">
            Esc
          </kbd>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {!trimmedQuery ? (
            <EmptyQueryState
              recent={recent}
              onPickRecent={(item) => {
                reset(item);
                inputRef.current?.focus();
              }}
              onClearRecent={() => {
                clearRecentSearches();
                setRecent([]);
              }}
              onNavigate={navigate}
            />
          ) : status === "error" ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[14px] text-neutral-600">搜尋暫時無法使用，請稍後再試。</p>
              <button
                type="button"
                onClick={retry}
                className="mt-4 rounded-full px-4 py-1.5 text-[13px] font-medium text-neutral-700 ring-1 ring-neutral-950/8 hover:bg-neutral-50"
              >
                重新載入
              </button>
            </div>
          ) : status !== "ready" ? (
            <div className="flex items-center justify-center gap-2 px-6 py-12 text-[13px] text-neutral-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              正在載入搜尋資料…
            </div>
          ) : hits.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-[14px] text-neutral-700">找不到「{trimmedQuery}」的相關結果</p>
              <p className="mt-2 text-[12px] text-neutral-500">試試較短的關鍵字，或用空格分隔多個關鍵字。</p>
            </div>
          ) : (
            <>
              {result.partial ? (
                <p className="px-4 pt-3 text-[12px] text-neutral-500">
                  沒有完全符合「{trimmedQuery}」的結果，以下為部分符合：
                </p>
              ) : null}
              <ul id={listboxId} role="listbox" aria-label="搜尋結果" className="p-2">
                {hits.map((hit, index) => {
                  const isActive = index === selectedIndex;
                  return (
                    <li key={hit.document.id} id={`${listboxId}-${index}`} role="option" aria-selected={isActive}>
                      <Link
                        href={hit.document.url}
                        onClick={() => {
                          saveRecentSearch(trimmedQuery);
                          onClose();
                        }}
                        onMouseMove={() => {
                          if (!isActive) setActiveIndex(index);
                        }}
                        tabIndex={-1}
                        className={`block rounded-lg px-3 py-2.5 transition-colors ${isActive ? "bg-neutral-100" : ""}`}
                      >
                        <SearchResultContent hit={hit} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {trimmedQuery && status === "ready" && result.hits.length > 0 ? (
          <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
            <span className="hidden items-center gap-3 text-[11px] text-neutral-400 sm:flex">
              <span><kbd className="font-mono">↑↓</kbd> 選擇</span>
              <span><kbd className="font-mono">Enter</kbd> 開啟</span>
            </span>
            <Link
              href={buildSearchPageHref(trimmedQuery)}
              onClick={() => {
                saveRecentSearch(trimmedQuery);
                onClose();
              }}
              className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
            >
              查看全部 {result.hits.length} 筆結果
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyQueryState({
  recent,
  onPickRecent,
  onClearRecent,
  onNavigate,
}: {
  recent: string[];
  onPickRecent: (query: string) => void;
  onClearRecent: () => void;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="space-y-5 px-4 py-4">
      {recent.length > 0 ? (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-medium text-neutral-500">最近搜尋</h2>
            <button type="button" onClick={onClearRecent} className="text-[11px] text-neutral-400 hover:text-neutral-700">
              清除
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {recent.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPickRecent(item)}
                className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-[12px] text-neutral-700 transition-colors hover:bg-neutral-200"
              >
                <ClockIcon className="h-3.5 w-3.5 text-neutral-400" />
                {item}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-[11px] font-medium text-neutral-500">法規列表</h2>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {CHARTER_DOCUMENTS.map((doc) => (
            <button
              key={doc.slug}
              type="button"
              onClick={() => onNavigate(`/charter/${doc.slug}`)}
              className="rounded-lg px-3 py-2 text-left text-[13px] text-neutral-700 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50"
            >
              {doc.title}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
