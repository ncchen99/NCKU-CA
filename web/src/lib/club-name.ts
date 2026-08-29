import type { FormField } from "@/types";

/** club_picker 在「無」選項時寫入的 sentinel 值 */
export const NO_CLUB_ID = "none";

/** 找不到對應社團時的顯示文字 */
export const NO_CLUB_LABEL = "無";

/**
 * 判斷 club_id 是否無法對應到 clubs 名單。
 * 未在系統名單內的單位（試辦社團、學生組織等）會是空值或 "none"。
 */
export function isUnresolvedClubId(clubId?: string | null): boolean {
  const trimmed = clubId?.trim() ?? "";
  return trimmed === "" || trimmed === NO_CLUB_ID;
}

/**
 * 建立新表單時使用的自填社團名稱欄位 id。
 */
export const CUSTOM_CLUB_NAME_FIELD_ID = "club_name_custom";

/**
 * 慣例欄位 id：搭配 club_picker 使用、選「無」時才顯示的自填社團名稱欄位。
 * 包含舊表單可能使用的別名。
 */
export const CUSTOM_CLUB_NAME_FIELD_IDS = [
  CUSTOM_CLUB_NAME_FIELD_ID,
  "club_name_other",
] as const;

/**
 * 找出表單中代表「社團名稱」的自填欄位。
 *
 * club_picker 儲存的是社團 ID 而非名稱，因此排除。查找順序：
 * 1. 慣例的自填欄位 id（club_picker + depends_on 的搭配欄位）
 * 2. default_from_user === "club_name" 的文字欄位
 * 3. 慣例欄位 id "club_name"（早期表單直接用文字欄位當社團名稱）
 */
export function findClubNameField(
  fields: FormField[] | undefined,
): FormField | undefined {
  if (!fields?.length) return undefined;
  const candidates = fields.filter(
    (f) => f.type !== "club_picker" && f.type !== "section_header",
  );
  return (
    candidates.find((f) =>
      (CUSTOM_CLUB_NAME_FIELD_IDS as readonly string[]).includes(f.id),
    ) ??
    candidates.find((f) => f.default_from_user === "club_name") ??
    candidates.find((f) => f.id === "club_name")
  );
}

/**
 * 從回覆內容取出使用者自填的社團名稱。
 * 當系統無法帶入 club_id 時，改以此值作為表單回覆與保證金紀錄的社團名稱。
 */
export function extractCustomClubName(
  fields: FormField[] | undefined,
  answers: Record<string, unknown> | undefined,
): string | undefined {
  const field = findClubNameField(fields);
  if (!field || !answers) return undefined;
  const raw = answers[field.id];
  if (typeof raw !== "string") return undefined;
  const value = raw.trim();
  // 使用者若在 club_picker 時代選了「無」，答案會是 sentinel 值，並非真正的名稱
  if (!value || value === NO_CLUB_ID) return undefined;
  return value;
}

/**
 * 依 club_id → 自填名稱的優先序解析要顯示的社團名稱。
 *
 * @param lookupClubName 以社團 ID 取得社團名稱（查無時回傳 undefined）
 */
export function resolveClubDisplayName(
  record: { club_id?: string | null; club_name_custom?: string | null },
  lookupClubName: (clubId: string) => string | undefined,
): string | undefined {
  const clubId = record.club_id?.trim() ?? "";

  if (!isUnresolvedClubId(clubId)) {
    return lookupClubName(clubId) ?? clubId;
  }

  const custom = record.club_name_custom?.trim();
  if (custom) {
    // 舊資料的自填欄位可能存的是社團 ID（club_picker 時代），能查到就換成名稱
    return lookupClubName(custom) ?? custom;
  }

  return clubId === NO_CLUB_ID ? NO_CLUB_LABEL : undefined;
}
