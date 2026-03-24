/**
 * 將 Firestore Timestamp、Admin SDK Timestamp、JSON 序列化格式轉成 Date。
 * JSON 可能為 `{ _seconds }` 或 `{ seconds }`（版本差異）。
 */
export function anyTimestampToDate(
  val: unknown,
): Date | null {
  if (val == null) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === "object" && val !== null && "toDate" in val) {
    try {
      const d = (val as { toDate: () => Date }).toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      /* fall through */
    }
  }
  if (typeof val === "string") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === "object" && val !== null) {
    const o = val as Record<string, unknown>;
    const sec =
      typeof o._seconds === "number"
        ? o._seconds
        : typeof o.seconds === "number"
          ? o.seconds
          : null;
    if (sec != null) {
      const d = new Date(sec * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
  }
  return null;
}

/** 點名／公告用：民國年習慣之日期時間字串 */
export function formatDateTimeZhTW(date: Date | null): string {
  if (!date) return "—";
  const d = date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const t = date.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${d} ${t}`;
}

export function formatDateTimeZhTWFromUnknown(val: unknown): string {
  return formatDateTimeZhTW(anyTimestampToDate(val));
}
