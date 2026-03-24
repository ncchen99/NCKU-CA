"use client";

import { useEffect, useState } from "react";
import { CLUB_CATEGORIES } from "@/lib/club-categories";
import { AppSelect, AppSelectOption } from "@/components/ui/app-select";

interface ClubOption {
  id: string;
  name: string;
}

interface ClubCategoryPickerProps {
  valueClubId: string;
  onChangeClubId: (clubId: string) => void;
  disabled?: boolean;
  /** 編輯個人資料時帶入既有社團所屬類別 */
  defaultCategoryName?: string;
  /** 預填既有社團名稱，優化載入體驗 */
  defaultClubName?: string;
}

export function ClubCategoryPicker({
  valueClubId,
  onChangeClubId,
  disabled,
  defaultCategoryName,
  defaultClubName,
}: ClubCategoryPickerProps) {
  const [categoryName, setCategoryName] = useState<string>(
    () => defaultCategoryName ?? "",
  );

  useEffect(() => {
    if (defaultCategoryName) setCategoryName(defaultCategoryName);
  }, [defaultCategoryName]);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(false);

  useEffect(() => {
    if (!categoryName) {
      setClubs([]);
      return;
    }
    let cancelled = false;
    setLoadingClubs(true);
    const q = encodeURIComponent(categoryName);
    fetch(`/api/public/clubs?category=${q}`)
      .then((r) => r.json())
      .then((d: { clubs?: ClubOption[] }) => {
        if (cancelled) return;
        setClubs(d.clubs ?? []);
      })
      .catch(() => {
        if (!cancelled) setClubs([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingClubs(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryName]);

  const categoryOptions: AppSelectOption[] = CLUB_CATEGORIES.map((c) => ({
    value: c.name,
    label: `${c.code}. ${c.name}`,
  }));

  const clubOptions: AppSelectOption[] = 
    clubs.length > 0
      ? clubs.map((c) => ({ value: c.id, label: c.name }))
      : valueClubId && defaultClubName
        ? [{ value: valueClubId, label: defaultClubName }]
        : [];

  const clubPlaceholder = !categoryName
    ? "請先選擇類別"
    : loadingClubs
      ? "載入中…"
      : clubs.length === 0
        ? "此類別尚無啟用中的社團"
        : "請選擇社團";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="text-[13px] font-medium text-neutral-700">社團類別</span>
        <AppSelect
          value={categoryName}
          options={categoryOptions}
          disabled={disabled}
          placeholder="請先選擇類別"
          onChange={(v) => {
            setCategoryName(v);
            onChangeClubId("");
          }}
        />
      </div>

      <div className="flex flex-[1.2] flex-col gap-1.5">
        <span className="text-[13px] font-medium text-neutral-700">社團名稱</span>
        <AppSelect
          value={valueClubId}
          options={clubOptions}
          disabled={disabled || !categoryName || loadingClubs}
          placeholder={clubPlaceholder}
          onChange={(v) => onChangeClubId(v)}
        />
      </div>
    </div>
  );
}
