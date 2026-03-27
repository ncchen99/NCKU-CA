"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  PlusIcon,
  ArrowDownTrayIcon,
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
import { toast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

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

function exportAttendanceCsv(
  detailData: AttendanceEventDetailResponse,
  labels: {
    headers: [string, string, string, string, string];
    checkedIn: string;
    notCheckedIn: string;
    filenameSuffix: string;
  },
) {
  const headers = labels.headers;
  const rows = detailData.clubStatuses.map((club) => [
    club.clubName,
    club.clubId,
    club.category,
    club.checkedIn ? labels.checkedIn : labels.notCheckedIn,
    club.checkedIn && club.checkedInAt ? formatDateTime(club.checkedInAt) : "",
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${detailData.event.title}_${labels.filenameSuffix}_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AttendancePage() {
  const t = useTranslations("adminAttendance");
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
  const [manualCheckingClubId, setManualCheckingClubId] = useState<string | null>(null);

  const tabs: { key: FilterStatus; label: string }[] = useMemo(
    () => [
      { key: "all", label: t("tabs.all") },
      { key: "open", label: t("tabs.open") },
      { key: "upcoming", label: t("tabs.upcoming") },
      { key: "closed", label: t("tabs.closed") },
    ],
    [t],
  );

  const statusConfig: Record<string, { variant: "success" | "neutral" | "primary"; label: string }> = useMemo(
    () => ({
      open: { variant: "success", label: t("status.open") },
      upcoming: { variant: "primary", label: t("status.upcoming") },
      closed: { variant: "neutral", label: t("status.closed") },
    }),
    [t],
  );

  const fetchEvents = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
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
      if (!background) {
        setError(err instanceof Error ? err.message : t("error.loadFailed"));
      } else {
        toast(err instanceof Error ? err.message : t("error.loadFailed"), "error");
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, [t]);

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
      setFormError(t("error.titleRequired"));
      return;
    }
    if (!form.opens_at) {
      setFormError(t("error.opensAtRequired"));
      return;
    }

    const computedClosesAt = form.closes_at || (() => {
      const opensAt = new Date(form.opens_at);
      if (isNaN(opensAt.getTime())) return "";
      opensAt.setHours(opensAt.getHours() + 2);
      return opensAt.toISOString();
    })();

    if (!computedClosesAt) {
      setFormError(t("error.closesAtRequired"));
      return;
    }

    if (!form.passcode.trim()) {
      setFormError(t("error.passcodeRequired"));
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
      toast(editingEvent ? t("toast.updated") : t("toast.created"), "success");
      await fetchEvents(true);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("error.actionFailed"));
    } finally {
      setFormLoading(false);
    }
  }

  const fetchDetail = useCallback(async (eventId: string) => {
    const detail = await adminFetch<AttendanceEventDetailResponse>(
      `/api/admin/attendance/${eventId}?includeClubStatuses=true`,
    );
    setDetailData(detail);
  }, []);

  const handleManualCheckIn = useCallback(
    async (club: AttendanceClubStatus) => {
      if (!detailEvent) return;
      setManualCheckingClubId(club.clubId);
      try {
        await adminFetch<{ id: string }>(
          `/api/admin/attendance/${detailEvent.id}/records`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              club_id: club.clubId,
              reason: t("manual.reason"),
            }),
          },
        );

        await Promise.all([fetchDetail(detailEvent.id), fetchEvents(true)]);
        toast(t("toast.manualCheckIn", { club: club.clubName }), "success");
      } catch (err) {
        toast(err instanceof Error ? err.message : t("error.manualFailed"), "error");
      } finally {
        setManualCheckingClubId(null);
      }
    },
    [detailEvent, fetchDetail, fetchEvents, t],
  );

  const detailClubColumns = useMemo<ColumnDef<AttendanceClubStatus>[]>(
    () => [
      {
        accessorKey: "clubName",
        header: ({ column }) => adminSortableHeader(column, t("detail.table.clubName")),
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
        header: ({ column }) => adminSortableHeader(column, t("detail.table.category")),
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
        header: ({ column }) => adminSortableHeader(column, t("detail.table.checkedInAt")),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="text-neutral-500">
            {row.original.checkedIn && row.original.checkedInAt
              ? formatDateTime(row.original.checkedInAt)
              : t("common.notAvailable")}
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
          adminSortableHeader(column, t("detail.table.status"), "right"),
        sortingFn: (rowA, rowB) =>
          Number(rowA.original.checkedIn) - Number(rowB.original.checkedIn),
        cell: ({ row }) => (
          <Badge
            variant={row.original.checkedIn ? "success" : "neutral"}
            className="inline-flex"
          >
            {row.original.checkedIn ? t("detail.status.checkedIn") : t("detail.status.notCheckedIn")}
          </Badge>
        ),
        meta: {
          thClassName:
            "cursor-pointer px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:bg-neutral-100",
          tdClassName: "px-4 py-3 text-right",
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          if (row.original.checkedIn) return null;
          const isLoading = manualCheckingClubId === row.original.clubId;
          return (
            <div className="text-right">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleManualCheckIn(row.original)}
                className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-60"
              >
                {isLoading ? t("manual.loading") : t("manual.action")}
              </button>
            </div>
          );
        },
        meta: {
          thClassName: "px-4 py-3 text-right",
          tdClassName: "px-4 py-3 text-right",
        },
      },
    ],
    [handleManualCheckIn, manualCheckingClubId, t],
  );

  async function openDetailModal(event: EventWithStats) {
    setDetailEvent(event);
    setDetailModalOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);

    try {
      await fetchDetail(event.id);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : t("error.loadDetailFailed"));
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
        title={t("title")}
        count={events.length}
        action={
          <Button onClick={openCreateModal}>
            <PlusIcon className="h-4 w-4" />
            {t("actions.create")}
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
                    {t("card.expected", { count: total })}
                  </div>
                  <div className="flex items-center gap-2 text-neutral-600">
                    <CheckCircleIcon className="h-4 w-4 text-neutral-400" />
                    {t("card.checkedIn", { checkedIn: event.checkedIn, total })}
                  </div>
                  {event.passcode && (
                    <div className="flex items-center gap-2 text-neutral-600">
                      <KeyIcon className="h-4 w-4 text-neutral-400" />
                      {t("card.passcode")}<span className="font-mono font-medium text-neutral-900">{event.passcode}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 min-h-[40px]">
                  {event.status !== "upcoming" ? (
                    <div>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-neutral-500">{t("card.attendanceRate")}</span>
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
                      {t("card.notStarted")}
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <button
                    type="button"
                    onClick={() => openEditModal(event)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
                    aria-label={t("actions.edit")}
                    title={t("actions.edit")}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openDetailModal(event)}
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                    {t("actions.view")}
                  </button>
                </div>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full">
              <AdminEmptyState message={t("empty")} />
            </div>
          )}
        </div>
      )}

      <FullPageFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        title={editingEvent ? t("modal.editTitle") : t("modal.createTitle")}
        submitLabel={editingEvent ? t("modal.save") : t("modal.create")}
        loading={formLoading}
      >
        {formError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </div>
        )}
        <FormField
          label={t("form.title")}
          required
          value={form.title}
          onChange={(e) => updateForm("title", e.target.value)}
          placeholder={t("form.titlePlaceholder")}
        />
        <FormField
          label={t("form.description")}
          as="textarea"
          value={form.description}
          onChange={(e) => updateForm("description", e.target.value)}
          placeholder={t("form.descriptionPlaceholder")}
        />
        <FormField
          label={t("form.passcode")}
          required
          value={form.passcode || ""}
          onChange={(e) => updateForm("passcode", e.target.value)}
          placeholder={t("form.passcodePlaceholder")}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label={t("form.opensAt")}
            required
            type="datetime-local"
            value={form.opens_at}
            onChange={(e) => updateForm("opens_at", e.target.value)}
          />
          <FormField
            label={t("form.closesAt")}
            required
            type="datetime-local"
            value={form.closes_at}
            onChange={(e) => updateForm("closes_at", e.target.value)}
            hint={t("form.closesAtHint")}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            {t("form.expectedCategories")}
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
        title={detailData?.event.title ?? detailEvent?.title ?? t("detail.title")}
        size="wide"
      >
        <div className="max-h-[78vh] overflow-y-auto pr-1">
          {detailLoading ? (
            <AdminSpinnerLoading message={t("detail.loading")} />
          ) : detailError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {detailError}
            </div>
          ) : detailData ? (
            <div className="space-y-4 py-2">
              {/* Summary cards */}
              <section className="overflow-hidden rounded-xl border border-border">
                <div className="grid grid-cols-3 divide-x divide-border">
                  <div className="flex flex-col items-center justify-center bg-primary/5 px-4 py-5 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary/60">{t("detail.summary.eventStatus")}</span>
                    <div className="mt-2">
                      <Badge variant={statusConfig[detailData.event.status]?.variant ?? "neutral"}>
                        {statusConfig[detailData.event.status]?.label ?? t("detail.unknownStatus")}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-neutral-50 px-4 py-5 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t("detail.summary.progress")}</span>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-neutral-900">{detailData.stats.checkedIn}</span>
                      <span className="text-sm text-neutral-400">/ {detailData.stats.total}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center bg-neutral-50 px-4 py-5 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t("detail.summary.attendanceRate")}</span>
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

              {/* Event schedule and notes */}
              <section className="rounded-xl border border-border bg-neutral-50/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                  <CalendarDaysIcon className="h-4 w-4 text-neutral-400" />
                  {t("detail.eventInfo.title")}
                </div>
                <div className="mt-4 grid gap-4 text-sm md:grid-cols-3">
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t("detail.eventInfo.opensAt")}</p>
                    <p className="font-medium text-neutral-700">{formatDateTime(detailData.event.opens_at)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t("detail.eventInfo.closesAt")}</p>
                    <p className="font-medium text-neutral-700">{formatDateTime(detailData.event.closes_at)}</p>
                  </div>
                  {detailData.event.passcode && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t("detail.eventInfo.passcode")}</p>
                      <p className="font-medium text-neutral-700 font-mono">{detailData.event.passcode}</p>
                    </div>
                  )}
                </div>
                {detailData.event.description && (
                  <div className="mt-4 border-t border-border/50 pt-4">
                    <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400">{t("detail.eventInfo.description")}</p>
                    <p className="text-sm leading-relaxed text-neutral-600">
                      {detailData.event.description}
                    </p>
                  </div>
                )}
              </section>

              {/* Attendance status list */}
              <section className="rounded-xl border border-border bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                    <UserGroupIcon className="h-4 w-4 text-neutral-400" />
                    {t("detail.list.title")}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-500">
                      {t("detail.list.totalClubs", { count: detailData.clubStatuses.length })}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        exportAttendanceCsv(detailData, {
                          headers: [
                            t("csv.clubName"),
                            t("csv.clubId"),
                            t("csv.category"),
                            t("csv.status"),
                            t("csv.checkedInAt"),
                          ],
                          checkedIn: t("detail.status.checkedIn"),
                          notCheckedIn: t("detail.status.notCheckedIn"),
                          filenameSuffix: t("csv.filenameSuffix"),
                        });
                        toast(t("toast.csvDownloaded"), "success");
                      }}
                      className="h-8"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      {t("actions.exportCsv")}
                    </Button>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  <AdminDataTable
                    data={detailData.clubStatuses}
                    columns={detailClubColumns}
                    getRowId={(row) => row.clubId}
                    emptyMessage={t("detail.empty")}
                    emptyColSpan={5}
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
