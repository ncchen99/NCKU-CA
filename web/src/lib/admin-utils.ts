export interface FirestoreTimestamp {
  _seconds?: number;
  seconds?: number;
  _nanoseconds?: number;
  nanoseconds?: number;
  toDate?: () => Date;
}

/** Robustly parse any Firestore Timestamp, Date, or string into a JS Date object */
function parseToDate(ts: unknown): Date | null {
  if (ts == null || ts === "") return null;
  
  if (ts instanceof Date) {
    return Number.isNaN(ts.getTime()) ? null : ts;
  }
  
  if (typeof ts === "object" && ts !== null) {
    if ("toDate" in ts && typeof (ts as { toDate: unknown }).toDate === "function") {
      try {
        const d = (ts as { toDate: () => Date }).toDate();
        return Number.isNaN(d.getTime()) ? null : d;
      } catch {
        // fallback
      }
    }
    
    const sec =
      typeof (ts as { seconds?: unknown }).seconds === "number"
        ? ((ts as { seconds: number }).seconds as number)
        : typeof (ts as { _seconds?: unknown })._seconds === "number"
          ? ((ts as { _seconds: number })._seconds as number)
          : null;
          
    if (sec !== null) {
      const d = new Date(sec * 1000);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  }
  
  if (typeof ts === "string") {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  
  return null;
}

/** 供表格排序：將 Firestore Timestamp、ISO 字串等轉成毫秒；無效則為 0 */
export function timestampToMs(ts: unknown): number {
  const d = parseToDate(ts);
  return d ? d.getTime() : 0;
}

export function formatTimestamp(ts: FirestoreTimestamp | string | null | undefined): string {
  const d = parseToDate(ts);
  if (!d) return "—";
  return d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatTime(ts: FirestoreTimestamp | string | null | undefined): string {
  const d = parseToDate(ts);
  if (!d) return "—";
  return d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(ts: FirestoreTimestamp | string | null | undefined): string {
  const d = parseToDate(ts);
  if (!d) return "—";
  const dateStr = d.toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = d.toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
  return `${dateStr} ${timeStr}`;
}

export async function adminFetch<T>(
  url: string,
  options?: RequestInit,
): Promise<T> {
  const mergedOptions: RequestInit = {
    cache: "no-store",
    ...options,
  };

  const res = await fetch(url, mergedOptions);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `HTTP ${res.status}`,
    );
  }
  return res.json() as Promise<T>;
}

