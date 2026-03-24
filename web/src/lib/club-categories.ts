/** 八大類社團（與後台點名／clubs.category 中文名稱一致） */
export const CLUB_CATEGORIES = [
  { code: "A", name: "系學會" },
  { code: "B", name: "綜合性" },
  { code: "C", name: "學藝性" },
  { code: "D", name: "康樂性" },
  { code: "E", name: "體能性" },
  { code: "F", name: "服務性" },
  { code: "G", name: "聯誼性" },
  { code: "H", name: "自治組織" },
] as const;

export type ClubCategoryCode = (typeof CLUB_CATEGORIES)[number]["code"];
