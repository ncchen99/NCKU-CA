"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { AppSelect } from "@/components/ui/app-select";
import { getActiveClubs } from "@/lib/client-firestore";
import { useTranslations } from "next-intl";

interface Club {
  id: string;
  name: string;
}

interface ClubSearchSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: boolean;
  /** 是否顯示「無」或「清除」選項 */
  allowClear?: boolean;
  clearLabel?: string;
  className?: string;
  /** 預填既有社團名稱，優化載入體驗（避免只顯示 ID） */
  initialClubName?: string;
}

const CACHE_KEY = "ncku_nca_clubs_cache";
const CACHE_TTL = 3600 * 1000; // 1 hour

// Simple session-wide memory cache to deduplicate simultaneous requests on the same page
let memoryCache: { data: Club[]; timestamp: number } | null = null;
let currentFetchPromise: Promise<Club[]> | null = null;

export function ClubSearchSelect({
  value,
  onChange,
  disabled,
  placeholder,
  error,
  allowClear = true,
  clearLabel,
  className,
  initialClubName,
}: ClubSearchSelectProps) {
  const t = useTranslations("clubSearchSelect");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClubs = useCallback(async () => {
    // 1. Check Memory Cache
    if (memoryCache && Date.now() - memoryCache.timestamp < CACHE_TTL) {
      setClubs(memoryCache.data);
      setLoading(false);
      return;
    }

    // 2. Check LocalStorage
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL) {
          setClubs(data);
          setLoading(false);
          // Still revalidate in background if desired, or just return
          // return;
        }
      }
    } catch (e) {
      console.warn("Failed to read club cache:", e);
    }

    // 3. De-duplicate actual fetch
    if (currentFetchPromise) {
      const data = await currentFetchPromise;
      setClubs(data);
      setLoading(false);
      return;
    }

    currentFetchPromise = (async () => {
      try {
        const list = await getActiveClubs();

        // Update caches
        memoryCache = { data: list, timestamp: Date.now() };
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
        } catch (e) {
          console.warn("Failed to write to club cache:", e);
        }

        return list;
      } catch (err) {
        console.error("Failed to fetch clubs for select:", err);
        return [];
      } finally {
        currentFetchPromise = null;
      }
    })();

    const data = await currentFetchPromise;
    setClubs(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const options = useMemo(() => {
    const list = clubs.map((c) => ({
      value: c.id,
      label: c.name,
    }));

    if (allowClear) {
      list.unshift({ value: "", label: clearLabel ?? t("clearLabel") });
    }

    // If we have a value but it's not in the loaded list,
    // (e.g. data hasn't loaded or it's a legacy ID),
    // and we have an initial/default name, add a temporary option.
    if (value && !list.find((o) => o.value === value) && initialClubName) {
      list.push({ value, label: initialClubName });
    }

    return list;
  }, [clubs, allowClear, clearLabel, value, initialClubName]);

  return (
    <AppSelect
      value={value}
      options={options}
      onChange={onChange}
      disabled={disabled || (loading && !initialClubName)}
      placeholder={loading ? t("loadingPlaceholder") : (placeholder ?? t("placeholder"))}
      invalid={error}
      searchable
      searchPlaceholder={t("searchPlaceholder")}
      className={className}
    />
  );
}
