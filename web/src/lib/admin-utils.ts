export interface FirestoreTimestamp {
  _seconds: number;
  _nanoseconds: number;
}

/** 供表格排序：將 Firestore Timestamp、ISO 字串等轉成毫秒；無效則為 0 */
export function timestampToMs(ts: unknown): number {
  if (ts == null || ts === "") return 0;
  if (typeof ts === "string") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (typeof ts === "object" && ts !== null && "_seconds" in ts) {
    return (ts as FirestoreTimestamp)._seconds * 1000;
  }
  return 0;
}

export function formatTimestamp(ts: FirestoreTimestamp | string | null | undefined): string {
  if (!ts) return "—";
  let date: Date;
  if (typeof ts === "string") {
    date = new Date(ts);
  } else if (typeof ts === "object" && ts !== null && "_seconds" in ts) {
    date = new Date(ts._seconds * 1000);
  } else {
    return "—";
  }
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatTime(ts: FirestoreTimestamp | string | null | undefined): string {
  if (!ts) return "—";
  let date: Date;
  if (typeof ts === "object" && ts !== null && "_seconds" in ts) {
    date = new Date(ts._seconds * 1000);
  } else if (typeof ts === "string") {
    date = new Date(ts);
  } else {
    return "—";
  }
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(ts: FirestoreTimestamp | string | null | undefined): string {
  if (!ts) return "—";
  const d = formatTimestamp(ts);
  const t = formatTime(ts);
  if (d === "—") return "—";
  return `${d} ${t}`;
}

export async function adminFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}
