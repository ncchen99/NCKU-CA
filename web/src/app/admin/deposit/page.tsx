"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AdminPageHeader,
  AdminFilterBar,
  AdminTableSkeleton,
  AdminErrorState,
  ConfirmDialog,
  FormModal,
  AdminTableCheckbox,
  AdminDataTable,
  adminSortableHeader,
  compareZh,
  type TabItem,
} from "@/components/admin/shared";
import { formatTimestamp, adminFetch, timestampToMs } from "@/lib/admin-utils";
import { toast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

type DepositStatus = "all" | "pending_payment" | "paid" | "returned";

interface DepositRecord {
  id: string;
  club_id: string;
  club_name?: string;
  form_id?: string;
  form_title?: string;
  form_response_id?: string;
  status: "pending_payment" | "paid" | "returned";
  amount: number;
  paid_at?: unknown;
  returned_at?: unknown;
  notes?: string;
  updated_by: string;
}

function downloadDepositCsv(records: DepositRecord[], statusConfig: Record<string, { variant: "warning" | "success" | "neutral"; label: string }>, t: (key: string) => string) {
  const headers = [
    t("csv.club"),
    t("csv.clubId"),
    t("csv.bindingForm"),
    t("csv.status"),
    t("csv.amount"),
    t("csv.paidAt"),
    t("csv.returnedAt"),
    t("csv.notes"),
    t("csv.updatedBy"),
  ];

  const rows = records.map((record) => {
    const statusLabel = statusConfig[record.status]?.label ?? record.status;
    return [
      record.club_name ?? "",
      record.club_id,
      record.form_title ?? (record.form_id || record.form_response_id ? t("common.boundUnknown") : t("common.independentDeposit")),
      statusLabel,
      String(record.amount),
      formatTimestamp(record.paid_at as Parameters<typeof formatTimestamp>[0]),
      formatTimestamp(record.returned_at as Parameters<typeof formatTimestamp>[0]),
      record.notes ?? "",
      record.updated_by,
    ];
  });

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
  a.download = `deposit_records_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function DepositPage() {
  const t = useTranslations("adminDeposit");
  const [activeTab, setActiveTab] = useState<DepositStatus>("all");
  const [search, setSearch] = useState("");
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // single status change
  const [confirmTarget, setConfirmTarget] = useState<{
    id: string;
    newStatus: "paid" | "returned";
    clubLabel: string;
  } | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // batch
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchConfirm, setBatchConfirm] = useState<{
    status: "paid" | "returned";
  } | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  // notes editing
  const [notesTarget, setNotesTarget] = useState<{
    id: string;
    notes: string;
  } | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);

  const tabs: TabItem<DepositStatus>[] = useMemo(
    () => [
      { key: "all", label: t("tabs.all") },
      { key: "pending_payment", label: t("tabs.pending") },
      { key: "paid", label: t("tabs.paid") },
      { key: "returned", label: t("tabs.returned") },
    ],
    [t],
  );

  const statusConfig: Record<string, { variant: "warning" | "success" | "neutral"; label: string }> = useMemo(
    () => ({
      pending_payment: { variant: "warning", label: t("status.pending") },
      paid: { variant: "success", label: t("status.paid") },
      returned: { variant: "neutral", label: t("status.returned") },
    }),
    [t],
  );

  const fetchDeposits = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
    try {
      const data = await adminFetch<DepositRecord[]>("/api/admin/deposits");
      setDeposits(data);
    } catch (err) {
      if (!background) {
        setError(err instanceof Error ? err.message : t("error.loadFailed"));
      } else {
        toast(err instanceof Error ? err.message : t("error.loadFailedToast"), "error");
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDeposits();
  }, [fetchDeposits]);

  // --- single update ---
  const handleConfirmStatus = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      await adminFetch("/api/admin/deposits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: confirmTarget.id,
          status: confirmTarget.newStatus,
        }),
      });
      setConfirmTarget(null);
      toast(t("toast.statusUpdated"), "success");
      await fetchDeposits(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error.actionFailed"), "error");
    } finally {
      setConfirmLoading(false);
    }
  };

  // --- batch update ---
  const handleBatchConfirm = async () => {
    if (!batchConfirm || selected.size === 0) return;
    setBatchLoading(true);
    try {
      await adminFetch("/api/admin/deposits/batch", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selected),
          status: batchConfirm.status,
        }),
      });
      setBatchConfirm(null);
      setSelected(new Set());
      toast(t("toast.batchSuccess"), "success");
      await fetchDeposits(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error.batchFailed"), "error");
    } finally {
      setBatchLoading(false);
    }
  };

  // --- notes save ---
  const handleNotesSave = async () => {
    if (!notesTarget) return;
    setNotesLoading(true);
    try {
      await adminFetch("/api/admin/deposits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: notesTarget.id,
          notes: notesTarget.notes,
        }),
      });
      setNotesTarget(null);
      toast(t("toast.notesUpdated"), "success");
      await fetchDeposits(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error.notesFailed"), "error");
    } finally {
      setNotesLoading(false);
    }
  };

  const filtered = deposits.filter((d) => {
    if (activeTab !== "all" && d.status !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      const idMatch = d.club_id.toLowerCase().includes(q);
      const nameMatch = (d.club_name ?? "").toLowerCase().includes(q);
      const formMatch = (d.form_title ?? d.form_id ?? "").toLowerCase().includes(q);
      if (!idMatch && !nameMatch && !formMatch) return false;
    }
    return true;
  });

  const pendingTotal = deposits
    .filter((d) => d.status === "pending_payment")
    .reduce((sum, d) => sum + d.amount, 0);

  // checkbox helpers
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((d) => selected.has(d.id));

  const toggleAll = useCallback(() => {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((d) => d.id)));
    }
  }, [allFilteredSelected, filtered]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedPendingCount = filtered.filter(
    (d) => selected.has(d.id) && d.status === "pending_payment",
  ).length;
  const selectedPaidCount = filtered.filter(
    (d) => selected.has(d.id) && d.status === "paid",
  ).length;

  const depositColumns = useMemo<ColumnDef<DepositRecord>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <AdminTableCheckbox
            checked={allFilteredSelected}
            onChange={toggleAll}
            aria-label={t("table.selectAll")}
          />
        ),
        cell: ({ row }) => (
          <AdminTableCheckbox
            checked={selected.has(row.original.id)}
            onChange={() => toggleOne(row.original.id)}
            aria-label={t("table.selectOne", { club: row.original.club_name ?? row.original.club_id })}
          />
        ),
        enableSorting: false,
        meta: {
          thClassName: "w-10 px-3 text-center",
          tdClassName: "w-10 px-3 text-center",
        },
      },
      {
        id: "club",
        accessorFn: (row) => row.club_name ?? row.club_id ?? "",
        header: ({ column }) => adminSortableHeader(column, t("table.club")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.getValue("club")),
            String(rowB.getValue("club")),
          ),
        cell: ({ row }) => (
          <span className="font-medium text-neutral-950">
            {row.original.club_name ?? row.original.club_id}
          </span>
        ),
        meta: { thClassName: "px-3", tdClassName: "px-3" },
      },
      {
        accessorKey: "amount",
        header: ({ column }) => adminSortableHeader(column, t("table.amount")),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold text-neutral-950">
            ${row.original.amount.toLocaleString()}
          </span>
        ),
      },
      {
        id: "binding",
        accessorFn: (row) => row.form_title ?? row.form_id ?? "",
        header: ({ column }) => adminSortableHeader(column, t("table.binding")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.getValue("binding")),
            String(rowB.getValue("binding")),
          ),
        cell: ({ row }) => {
          const dep = row.original;
          const hasBinding = Boolean(dep.form_title || dep.form_id || dep.form_response_id);
          if (!hasBinding) {
            return <span className="text-neutral-400">{t("common.independentDeposit")}</span>;
          }

          const label = dep.form_title ?? t("common.boundUnknown");

          return <span className="truncate text-neutral-700">{label}</span>;
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => adminSortableHeader(column, t("table.status")),
        sortingFn: (rowA, rowB) =>
          compareZh(rowA.original.status, rowB.original.status),
        cell: ({ row }) => {
          const badge = statusConfig[row.original.status];
          return <Badge variant={badge.variant}>{badge.label}</Badge>;
        },
      },
      {
        id: "paid_at",
        accessorFn: (row) => timestampToMs(row.paid_at),
        header: ({ column }) => adminSortableHeader(column, t("table.paidAt")),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="text-neutral-400">
            {formatTimestamp(
              row.original.paid_at as Parameters<typeof formatTimestamp>[0],
            )}
          </span>
        ),
      },
      {
        id: "returned_at",
        accessorFn: (row) => timestampToMs(row.returned_at),
        header: ({ column }) => adminSortableHeader(column, t("table.returnedAt")),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="text-neutral-400">
            {formatTimestamp(
              row.original.returned_at as Parameters<
                typeof formatTimestamp
              >[0],
            )}
          </span>
        ),
      },
      {
        id: "notes",
        accessorFn: (row) => row.notes ?? "",
        header: ({ column }) => adminSortableHeader(column, t("table.notes")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.getValue("notes")),
            String(rowB.getValue("notes")),
          ),
        cell: ({ row }) => {
          const dep = row.original;
          return (
            <button
              type="button"
              className="max-w-[120px] truncate text-[12px] text-neutral-500 underline decoration-dashed underline-offset-2 hover:text-neutral-700"
              title={dep.notes || t("notes.add")}
              onClick={() =>
                setNotesTarget({
                  id: dep.id,
                  notes: dep.notes ?? "",
                })
              }
            >
              {dep.notes || "—"}
            </button>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const dep = row.original;
          return (
            <div className="text-right">
              {dep.status === "pending_payment" && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                  onClick={() =>
                    setConfirmTarget({
                      id: dep.id,
                      newStatus: "paid",
                      clubLabel: dep.club_name ?? dep.club_id,
                    })
                  }
                >
                  {t("actions.markPaid")}
                </button>
              )}
              {dep.status === "paid" && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                  onClick={() =>
                    setConfirmTarget({
                      id: dep.id,
                      newStatus: "returned",
                      clubLabel: dep.club_name ?? dep.club_id,
                    })
                  }
                >
                  {t("actions.returnDeposit")}
                </button>
              )}
            </div>
          );
        },
        meta: { thClassName: "px-5 text-right", tdClassName: "px-5 text-right" },
      },
    ],
    [allFilteredSelected, selected, statusConfig, t, toggleAll, toggleOne],
  );

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        subtitle={
          !loading && !error
            ? t("subtitle", { amount: pendingTotal.toLocaleString() })
            : undefined
        }
        action={
          <Button
            variant="ghost"
            onClick={() => {
              downloadDepositCsv(filtered, statusConfig, t);
              toast(t("toast.csvDownloaded"), "success");
            }}
            disabled={loading || !!error || filtered.length === 0}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {t("actions.exportCsv")}
          </Button>
        }
      />

      <Card className="mt-6">
        <div className="relative">
          <AdminFilterBar
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={(t) => {
              setActiveTab(t);
              setSelected(new Set());
            }}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("searchPlaceholder")}
          />

          {/* batch action toolbar overlays filter bar to avoid layout shift */}
          {selected.size > 0 && (
            <div className="absolute inset-0 z-10 flex items-center gap-3 border-b border-border bg-white px-5 rounded-t-lg">
              <span className="text-sm font-medium text-neutral-700">
                {t("batch.selected", { count: selected.size })}
              </span>
              {selectedPendingCount > 0 && (
                <button
                  className="rounded-full border border-primary/20 bg-white px-3 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                  onClick={() => setBatchConfirm({ status: "paid" })}
                >
                  {t("batch.markPaid", { count: selectedPendingCount })}
                </button>
              )}
              {selectedPaidCount > 0 && (
                <button
                  className="rounded-full border border-primary/20 bg-white px-3 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                  onClick={() => setBatchConfirm({ status: "returned" })}
                >
                  {t("batch.returned", { count: selectedPaidCount })}
                </button>
              )}
              <button
                className="ml-auto text-xs text-neutral-400 hover:text-neutral-600"
                onClick={() => setSelected(new Set())}
              >
                {t("batch.clear")}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="overflow-hidden">
            <AdminTableSkeleton rows={6} columns={[24, 120, 80, 64, 56, 80, 80]} />
          </div>
        ) : error ? (
          <AdminErrorState message={error} onRetry={fetchDeposits} />
        ) : (
          <AdminDataTable
            data={filtered}
            columns={depositColumns}
            getRowId={(row) => row.id}
            emptyMessage={t("empty")}
            emptyColSpan={9}
          />
        )}
      </Card>

      {/* single status confirm */}
      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleConfirmStatus}
        loading={confirmLoading}
        title={
          confirmTarget?.newStatus === "paid"
            ? t("confirm.markPaidTitle")
            : t("confirm.returnTitle")
        }
        description={
          confirmTarget
            ? t("confirm.singleDescription", { club: confirmTarget.clubLabel })
            : undefined
        }
        confirmLabel={
          confirmTarget?.newStatus === "paid" ? t("actions.markPaid") : t("actions.confirmReturn")
        }
      />

      {/* batch confirm */}
      <ConfirmDialog
        open={!!batchConfirm}
        onClose={() => setBatchConfirm(null)}
        onConfirm={handleBatchConfirm}
        loading={batchLoading}
        title={
          batchConfirm?.status === "paid"
            ? t("confirm.batchMarkPaidTitle", { count: selected.size })
            : t("confirm.batchReturnTitle", { count: selected.size })
        }
        description={t("confirm.batchDescription")}
        confirmLabel={t("confirm.execute")}
      />

      {/* notes edit modal */}
      <FormModal
        open={!!notesTarget}
        onClose={() => setNotesTarget(null)}
        onSubmit={handleNotesSave}
        title={t("notes.title")}
        submitLabel={t("notes.save")}
        loading={notesLoading}
        className="max-w-3xl"
      >
        <textarea
          value={notesTarget?.notes ?? ""}
          onChange={(e) =>
            setNotesTarget((prev) =>
              prev ? { ...prev, notes: e.target.value } : null,
            )
          }
          placeholder={t("notes.placeholder")}
          className="h-[48vh] w-full resize-none rounded-lg border border-border bg-white px-3 py-2 text-sm text-neutral-950 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary focus:ring-1 focus:ring-primary/30"
          aria-label={t("notes.ariaLabel")}
        />
      </FormModal>
    </>
  );
}
