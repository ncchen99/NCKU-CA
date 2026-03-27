"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export interface TabItem<T extends string = string> {
  key: T;
  label: string;
}

interface AdminFilterBarProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

export function AdminFilterBar<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  search,
  onSearchChange,
  searchPlaceholder,
}: AdminFilterBarProps<T>) {
  const t = useTranslations("adminCommon");
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("searchPlaceholder");

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 pt-4 pb-3">
      <div className="flex gap-1">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant="pill"
            size="sm"
            active={activeTab === t.key}
            onClick={() => onTabChange(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>
      {onSearchChange !== undefined && (
        <div className="ml-auto flex items-center gap-2 rounded-full border border-border bg-white px-3 py-1.5">
          <MagnifyingGlassIcon className="h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder={resolvedSearchPlaceholder}
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-44 bg-transparent text-[13px] outline-none placeholder:text-neutral-400"
          />
        </div>
      )}
    </div>
  );
}
