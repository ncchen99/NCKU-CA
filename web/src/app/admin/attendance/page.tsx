"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  PlusIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilSquareIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { KeyIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  AdminPageHeader,
  FullPageFormModal,
  FormField,
  AdminEmptyState,
  AdminErrorState,
  AdminSpinnerLoading,
  AdminDataTable,
  adminSortableHeader,
  compareZh,
} from "@/components/admin/shared";
import {
  formatTimestamp,
  formatTime,
  formatDateTime,
  adminFetch,
  timestampToMs,
} from "@/lib/admin-utils";

type FilterStatus = "all" | "upcoming" | "open" | "closed";

interface AttendanceEvent {
  id: string;
  title: string;
  description?: string;
  status: "upcoming" | "open" | "closed";
  expected_clubs: string[];
  opens_at: { _seconds: number; _nanoseconds: number } | string;
  closes_at: { _seconds: number; _nanoseconds: number } | string;
  created_by: string;
  passcode?: string;
}

interface EventWithStats extends AttendanceEvent {
  checkedIn: number;
  /** 依類別展開後的啟用社團數（來自 API stats，非 expected_clubs 長度） */
  totalClubs?: number;
}

interface AttendanceClubStatus {
  clubId: string;
  clubName: string;
  category: string;
  checkedIn: boolean;
  checkedInAt?: { _seconds: number; _nanoseconds: number } | string;
}

interface AttendanceEventDetailResponse {
  event: AttendanceEvent;
  stats: { total: number; checkedIn: number };
  clubStatuses: AttendanceClubStatus[];
}

const CLUB_CATEGORIES = [
  { code: "A", name: "系學會" },
  { code: "B", name: "綜合性" },
  { code: "C", name: "學藝性" },
  { code: "D", name: "康樂性" },
  { code: "E", name: "體能性" },
  { code: "F", name: "服務性" },
  { code: "G", name: "聯誼性" },
  { code: "H", name: "自治組織" },
] as const;

interface EventFormData {
  title: string;
  description: string;
  opens_at: string;
  closes_at: string;
  expected_categories: string[];
  passcode: string;
}

const initialForm: EventFormData = {
  title: "",
  description: "",
  opens_at: "",
  closes_at: "",
  expected_categories: [],
  passcode: "",
};

const tabs: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "open", label: "進行中" },
  { key: "upcoming", label: "即將開始" },
  { key: "closed", label: "已結束" },
];

const statusConfig: Record<
  string,
  { variant: "success" | "neutral" | "primary"; label: string }
> = {
  open: { variant: "success", label: "進行中" },
  upcoming: { variant: "primary", label: "即將開始" },
  closed: { variant: "neutral", label: "已結束" },
};

function tsToDatetimeLocal(
  ts: { _seconds: number; _nanoseconds?: number } | string | undefined,
): string {
  if (!ts) return "";
  const date =
    typeof ts === "string" ? new Date(ts) : new Date(ts._seconds * 1000);
  if (isNaN(date.getTime())) return "";
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<FilterStatus>("all");
  const [events, setEvents] = useState<EventWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AttendanceEvent | null>(
    null,
  );
  const [form, setForm] = useState<EventFormData>(initialForm);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailData, setDetailData] =
    useState<AttendanceEventDetailResponse | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventWithStats | null>(null);
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { events: data } = await adminFetch<{
        events: AttendanceEvent[];
      }>("/api/admin/attendance");

      const withStats: EventWithStats[] = data.map((e) => ({
        ...e,
        checkedIn: 0,
      }));

      const results = await Promise.allSettled(
        data.map((e) =>
          adminFetch<{ stats: { total: number; checkedIn: number } }>(
            `/api/admin/attendance/${e.id}`,
          ),
        ),
      );

      const statsMap = new Map<
        string,
        { checkedIn: number; total: number }
      >();
      data.forEach((e, i) => {
        const r = results[i];
        if (r.status === "fulfilled") {
          statsMap.set(e.id, {
            checkedIn: r.value.stats.checkedIn,
            total: r.value.stats.total,
          });
        }
      });

      setEvents(
        withStats.map((e) => {
          const s = statsMap.get(e.id);
          return {
            ...e,
            checkedIn: s?.checkedIn ?? 0,
            totalClubs: s?.total,
          };
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入點名活動失敗");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filtered = events.filter(
    (e) => activeTab === "all" || e.status === activeTab,
  );

  function openCreateModal() {
    setEditingEvent(null);
    setForm(initialForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(event: EventWithStats) {
    setEditingEvent(event);
    const cats: string[] = [];
    for (const c of event.expected_clubs) {
      const found = CLUB_CATEGORIES.find((cat) => cat.name === c);
      if (found) cats.push(found.code);
    }
    setForm({
      title: event.title,
      description: event.description ?? "",
      opens_at: tsToDatetimeLocal(event.opens_at),
      closes_at: tsToDatetimeLocal(event.closes_at),
      expected_categories: cats.length > 0 ? cats : [...event.expected_clubs],
      passcode: event.passcode ?? "",
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit() {
    setFormError(null);

    if (!form.title.trim()) {
      setFormError("請輸入活動名稱");
      return;
    }
    if (!form.opens_at) {
      setFormError("請設定開始時間");
      return;
    }

    const computedClosesAt = form.closes_at || (() => {
      const opensAt = new Date(form.opens_at);
      if (isNaN(opensAt.getTime())) return "";
      opensAt.setHours(opensAt.getHours() + 2);
      return opensAt.toISOString();
    })();

    if (!computedClosesAt) {
      setFormError("請設定結束時間");
      return;
    }

    if (!form.passcode.trim()) {
      setFormError("請設定點名密碼");
      return;
    }

    const clubs = form.expected_categories.map((code) => {
      const cat = CLUB_CATEGORIES.find((c) => c.code === code);
      return cat ? cat.name : code;
    });

    const body = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      status: "upcoming" as const,
      expected_clubs: clubs,
      opens_at: new Date(form.opens_at).toISOString(),
      closes_at: new Date(computedClosesAt).toISOString(),
      passcode: form.passcode.trim(),
    };

    setFormLoading(true);
    try {
      if (editingEvent) {
        await adminFetch(`/api/admin/attendance/${editingEvent.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await adminFetch<{ id: string }>("/api/admin/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      setModalOpen(false);
      await fetchEvents();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "操作失敗");
    } finally {
      setFormLoading(false);
    }
  }

  const detailClubColumns = useMemo<ColumnDef<AttendanceClubStatus>[]>(
    () => [
      {
        accessorKey: "clubName",
        header: ({ column }) => adminSortableHeader(column, "社團名稱"),
        sortingFn: (rowA, rowB) =>
          compareZh(rowA.original.clubName, rowB.original.clubName),
        cell: ({ row }) => (
          <span className="font-medium text-neutral-900">{row.original.clubName}</span>
        ),
        meta: {
          thClassName:
            "cursor-pointer px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:bg-neutral-100",
          tdClassName: "px-4 py-3",
        },
      },
      {
        accessorKey: "category",
        header: ({ column }) => adminSortableHeader(column, "類型"),
        sortingFn: (rowA, rowB) =>
          compareZh(rowA.original.category, rowB.original.category),
        cell: ({ row }) => (
          <span className="text-neutral-500">{row.original.category}</span>
        ),
        meta: {
          thClassName:
            "cursor-pointer px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:bg-neutral-100",
          tdClassName: "px-4 py-3",
        },
      },
      {
        id: "checkedInAt",
        accessorFn: (row) =>
          row.checkedIn && row.checkedInAt
            ? timestampToMs(row.checkedInAt)
            : 0,
        header: ({ column }) => adminSortableHeader(column, "簽到時間"),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="text-neutral-500">
            {row.original.checkedIn && row.original.checkedInAt
              ? formatDateTime(row.original.checkedInAt)
              : "—"}
          </span>
        ),
        meta: {
          thClassName:
            "cursor-pointer px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:bg-neutral-100",
          tdClassName: "px-4 py-3",
        },
      },
      {
        accessorKey: "checkedIn",
        header: ({ column }) =>
          adminSortableHeader(column, "狀態", "right"),
        sortingFn: (rowA, rowB) =>
          Number(rowA.original.checkedIn) - Number(rowB.original.checkedIn),
        cell: ({ row }) => (
          <Badge
            variant={row.original.checkedIn ? "success" : "neutral"}
            className="inline-flex"
          >
            {row.original.checkedIn ? "已簽到" : "未簽到"}
          </Badge>
        ),
        meta: {
          thClassName:
            "cursor-pointer px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:bg-neutral-100",
          tdClassName: "px-4 py-3 text-right",
        },
      },
    ],
    [],
  );

  async function openDetailModal(event: EventWithStats) {
    setDetailEvent(event);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    try {
      const detail = await adminFetch<AttendanceEventDetailResponse>(
        `/api/admin/attendance/${event.id}?includeClubStatuses=true`,
      );
      setDetailData(detail);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "載入點名詳情失敗");
    } finally {
      setDetailLoading(false);
    }
  }

  function updateForm(field: keyof EventFormData, value: string | string[]) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (
        field === "opens_at" &&
        typeof value === "string" &&
        value &&
        !editingEvent
      ) {
        const dt = new Date(value);
        if (!isNaN(dt.getTime())) {
          dt.setHours(dt.getHours() + 2);
          const p = (n: number) => n.toString().padStart(2, "0");
          next.closes_at = `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
        }
      }
      return next;
    });
  }

  function toggleCategory(code: string) {
    setForm((prev) => {
      const has = prev.expected_categories.includes(code);
      return {
        ...prev,
        expected_categories: has
          ? prev.expected_categories.filter((c) => c !== code)
          : [...prev.expected_categories, code],
      };
    });
  }

  return (
    <>
      <AdminPageHeader
        title="點名管理"
        count={events.length}
        action={
          <Button onClick={openCreateModal}>
            <PlusIcon className="h-4 w-4" />
            建立點名活動
          </Button>
        }
      />

      <div className="mt-6 flex gap-1">
        {tabs.map((t) => (
          <Button
            key={t.key}
            variant="pill"
            size="sm"
            active={activeTab === t.key}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <div className="animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-4 w-40 rounded bg-neutral-200" />
                  <div className="h-5 w-16 rounded-full bg-neutral-200" />
                </div>
                <div className="mt-4 space-y-2.5">
                  <div className="h-3.5 w-48 rounded bg-neutral-100" />
                  <div className="h-3.5 w-32 rounded bg-neutral-100" />
                  <div className="h-3.5 w-36 rounded bg-neutral-100" />
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-neutral-100" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="mt-4">
          <AdminErrorState message={error} onRetry={fetchEvents} />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((event) => {
            const badge = statusConfig[event.status];
            const total = event.totalClubs ?? 0;
            const rate =
              total > 0 ? Math.round((event.checkedIn / total) * 100) : 0;

            return (
              <Card key={event.id} hoverable className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-neutral-950">
                    {event.title}
                  </h3>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>

                <div className="mt-4 space-y-2.5 text-[13px]">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <CalendarDaysIcon className="h-4 w-4 text-neutral-400" />
                    {formatTimestamp(event.opens_at)}{" "}
                    {formatTime(event.opens_at)}–{formatTime(event.closes_at)}
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <UserGroupIcon className="h-4 w-4 text-neutral-400" />
                    預計 {total} 社團
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <CheckCircleIcon className="h-4 w-4 text-neutral-400" />
                    已簽到 {event.checkedIn} / {total}
                  </div>
                  {event.passcode && (
                    <div className="flex items-center gap-2 text-neutral-600">
                      <KeyIcon className="h-4 w-4 text-neutral-400" />
                      密碼：<span className="font-mono font-medium text-neutral-900">{event.passcode}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 min-h-[40px]">
                  {event.status !== "upcoming" ? (
                    <div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-neutral-500">出席率</span>
                        <span className="font-semibold text-neutral-950">
                          {rate}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 pt-1 text-[12px] text-neutral-400">
                      <ClockIcon className="h-3.5 w-3.5" />
                      尚未開始
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(event)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
                    aria-label="編輯點名活動"
                    title="編輯"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDetailModal(event)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    檢視
                  </button>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full">
              <AdminEmptyState message="沒有符合條件的點名活動" />
            </div>
          )}
        </div>
      )}

      <FullPageFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        title={editingEvent ? "編輯點名活動" : "建立點名活動"}
        submitLabel={editingEvent ? "儲存變更" : "建立"}
        loading={formLoading}
      >
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </div>
        )}
        <FormField
          label="活動名稱"
          required
          value={form.title}
          onChange={(e) => updateForm("title", e.target.value)}
          placeholder="例：第一次社長大會出席點名"
        />
        <FormField
          label="說明"
          as="textarea"
          value={form.description}
          onChange={(e) => updateForm("description", e.target.value)}
          placeholder="活動說明（選填）"
        />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <FormField
              label="點名密碼"
              required
              value={form.passcode || ""}
              onChange={(e) => updateForm("passcode", e.target.value)}
              placeholder="請輸入或產生密碼"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="mb-[2px] h-[38px] px-3"
            onClick={() => updateForm("passcode", Math.random().toString(36).slice(-6).toUpperCase())}
          >
            隨機產生
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="開始時間"
            required
            type="datetime-local"
            value={form.opens_at}
            onChange={(e) => updateForm("opens_at", e.target.value)}
          />
          <FormField
            label="結束時間"
            required
            type="datetime-local"
            value={form.closes_at}
            onChange={(e) => updateForm("closes_at", e.target.value)}
            hint="選擇開始時間後自動填入 +2 小時"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            預計參加的社團類型
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CLUB_CATEGORIES.map((cat) => (
              <label
                key={cat.code}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${form.expected_categories.includes(cat.code)
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-neutral-600 hover:bg-neutral-50"
                  }`}
              >
                <input
                  type="checkbox"
                  checked={form.expected_categories.includes(cat.code)}
                  onChange={() => toggleCategory(cat.code)}
                  className="sr-only"
                />
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${form.expected_categories.includes(cat.code)
                    ? "border-primary bg-primary text-white"
                    : "border-neutral-300"
                    }`}
                >
                  {form.expected_categories.includes(cat.code) && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span className="font-medium">{cat.name}</span>
              </label>
            ))}
          </div>
        </div>
      </FullPageFormModal>

      <Modal
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={detailData?.event.title ?? detailEvent?.title ?? "點名詳情"}
        size="wide"
      >
        <div className="max-h-[78vh] overflow-y-auto pr-1">
          {detailLoading ? (
            <AdminSpinnerLoading message="正在載入點名詳情..." />
          ) : detailError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {detailError}
            </div>
          ) : detailData ? (
            <div className="space-y-4 py-2">
              {/* 統計卡片 */}
              <section className="overflow-hidden rounded-xl border border-border">
                <div className="grid grid-cols-3 divide-x divide-border">
                  <div className="flex flex-col items-center justify-center bg-primary/5 px-4 py-5 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary/60">活動狀態</span>
                    <div className="mt-2">
                      <Badge variant={statusConfig[detailData.event.status]?.variant ?? "neutral"}>
                        {statusConfig[detailData.event.status]?.label ?? "未知"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-neutral-50 px-4 py-5 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">簽到進度</span>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-neutral-900">{detailData.stats.checkedIn}</span>
                      <span className="text-sm text-neutral-400">/ {detailData.stats.total}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-neutral-50 px-4 py-5 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">出席率</span>
                    <div className="mt-2">
                      <span className="text-2xl font-bold text-neutral-900">
                        {detailData.stats.total > 0
                          ? Math.round((detailData.stats.checkedIn / detailData.stats.total) * 100)
                          : 0}%
                      </span>
                    </div>
                    {detailData.stats.total > 0 && (
                      <div className="mt-2 w-20 h-1.5 overflow-hidden rounded-full bg-neutral-200">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.round((detailData.stats.checkedIn / detailData.stats.total) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* 活動時間與說明 */}
              <section className="rounded-xl border border-border bg-neutral-50/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <CalendarDaysIcon className="h-4 w-4 text-neutral-400" />
                  活動時間與說明
                </div>
                <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">開始時間</p>
                    <p className="font-medium text-neutral-700">{formatDateTime(detailData.event.opens_at)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">結束時間</p>
                    <p className="font-medium text-neutral-700">{formatDateTime(detailData.event.closes_at)}</p>
                  </div>
                  {detailData.event.passcode && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">點名密碼</p>
                      <p className="font-medium text-neutral-700 font-mono">{detailData.event.passcode}</p>
                    </div>
                  )}
                </div>
                {detailData.event.description && (
                  <div className="mt-4 border-t border-border/50 pt-4">
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">活動說明</p>
                    <p className="text-sm leading-relaxed text-neutral-600">
                      {detailData.event.description}
                    </p>
                  </div>
                )}
              </section>

              {/* 簽到狀態清單 */}
              <section className="rounded-xl border border-border bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <UserGroupIcon className="h-4 w-4 text-neutral-400" />
                    簽到狀態清單
                  </h4>
                  <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
                    共 {detailData.clubStatuses.length} 個社團
                  </span>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <AdminDataTable
                    data={detailData.clubStatuses}
                    columns={detailClubColumns}
                    getRowId={(row) => row.clubId}
                    emptyMessage="尚未設定預計社團，或找不到對應社團資料。"
                    emptyColSpan={4}
                    classNames={{
                      table: "w-full text-left text-sm",
                      theadTr: "bg-neutral-50",
                      th: "",
                      td: "",
                      tbody: "divide-y divide-border",
                      bodyRow:
                        "transition-colors hover:bg-neutral-50/50 border-0",
                    }}
                  />
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
}
