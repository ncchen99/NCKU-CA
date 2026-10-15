"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  prepareSearchIndex,
  searchIndex,
  type PreparedSearchIndex,
  type SearchResult,
} from "@/lib/search/engine";
import type { SearchIndexPayload } from "@/lib/search/types";

export type SearchIndexStatus = "idle" | "loading" | "ready" | "error";

const EMPTY_RESULT: SearchResult = { hits: [], partial: false, terms: [] };

let indexPromise: Promise<PreparedSearchIndex> | null = null;
let preparedIndex: PreparedSearchIndex | null = null;

/** 下載並準備索引；同一個分頁只會下載一次。 */
export function loadSiteSearchIndex(): Promise<PreparedSearchIndex> {
  if (preparedIndex) return Promise.resolve(preparedIndex);
  if (!indexPromise) {
    indexPromise = fetch("/api/search-index")
      .then(async (response) => {
        if (!response.ok) throw new Error(`search index ${response.status}`);
        const payload = (await response.json()) as SearchIndexPayload;
        preparedIndex = prepareSearchIndex(payload.documents ?? []);
        return preparedIndex;
      })
      .catch((error) => {
        indexPromise = null;
        throw error;
      });
  }
  return indexPromise;
}

export function useSiteSearch(query: string, enabled = true) {
  const [index, setIndex] = useState<PreparedSearchIndex | null>(preparedIndex);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || index || failed) return;
    let cancelled = false;
    loadSiteSearchIndex()
      .then((loaded) => {
        if (!cancelled) setIndex(loaded);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, index, failed, attempt]);

  const retry = useCallback(() => {
    setFailed(false);
    setAttempt((count) => count + 1);
  }, []);

  const status: SearchIndexStatus = index ? "ready" : failed ? "error" : enabled ? "loading" : "idle";

  const deferredQuery = useDeferredValue(query);
  const result = useMemo(() => {
    if (!index || !deferredQuery.trim()) return EMPTY_RESULT;
    return searchIndex(index, deferredQuery);
  }, [index, deferredQuery]);

  return {
    status,
    result,
    retry,
    isStale: deferredQuery !== query,
  };
}
