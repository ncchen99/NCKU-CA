"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AdminPageHeader,
  AdminFilterBar,
  AdminTableSkeleton,
  AdminErrorState,
  ConfirmDialog,
  FormModal,
  FormField,
  AdminTableCheckbox,
  AdminDataTable,
  adminSortableHeader,
  compareZh,
  type TabItem,
} from "@/components/admin/shared";
import { formatTimestamp, adminFetch, timestampToMs } from "@/lib/admin-utils";

type DepositStatus = "all" | "pending_payment" | "paid" | "returned";

interface DepositRecord {
  id: string;
  club_id: string;
  club_name?: string;
  form_response_id?: string;
  status: "pending_payment" | "paid" | "returned";
  amount: number;
  paid_at?: unknown;
  returned_at?: unknown;
  notes?: string;
  updated_by: string;
}

const tabs: TabItem<DepositStatus>[] = [
  { key: "all", label: "全部" },
  { key: "pending_payment", label: "待繳" },
  { key: "paid", label: "已繳" },
  { key: "returned", label: "已退還" },
];

const statusConfig: Record<
  string,
  { variant: "warning" | "success" | "neutral"; label: string }
> = {
  pending_payment: { variant: "warning", label: "待繳" },
  paid: { variant: "success", label: "已繳" },
  returned: { variant: "neutral", label: "已退還" },
};

export default function DepositPage() {
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

  const fetchDeposits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<DepositRecord[]>("/api/admin/deposits");
      setDeposits(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入資料時發生錯誤");
    } finally {
      setLoading(false);
    }
  }, []);

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
      await fetchDeposits();
    } catch (err) {
      alert(err instanceof Error ? err.message : "操作失敗，請稍後再試");
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
      await fetchDeposits();
    } catch (err) {
      alert(err instanceof Error ? err.message : "批次操作失敗");
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
      await fetchDeposits();
    } catch (err) {
      alert(err instanceof Error ? err.message : "備註更新失敗");
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
      if (!idMatch && !nameMatch) return false;
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
            aria-label="全選目前篩選結果"
          />
        ),
        cell: ({ row }) => (
          <AdminTableCheckbox
            checked={selected.has(row.original.id)}
            onChange={() => toggleOne(row.original.id)}
            aria-label={`選取 ${row.original.club_name ?? row.original.club_id}`}
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
        header: ({ column }) => adminSortableHeader(column, "社團"),
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
        header: ({ column }) => adminSortableHeader(column, "金額"),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold text-neutral-950">
            ${row.original.amount.toLocaleString()}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => adminSortableHeader(column, "狀態"),
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
        header: ({ column }) => adminSortableHeader(column, "繳費日期"),
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
        header: ({ column }) => adminSortableHeader(column, "退還日期"),
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
        header: ({ column }) => adminSortableHeader(column, "備註"),
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
              title={dep.notes || "點擊新增備註"}
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
                  標記已繳
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
                  退還保證金
                </button>
              )}
            </div>
          );
        },
        meta: { thClassName: "px-5 text-right", tdClassName: "px-5 text-right" },
      },
    ],
    [
      allFilteredSelected,
      selected,
      toggleAll,
      toggleOne,
    ],
  );

  return (
    <>
      <AdminPageHeader
        title="保證金管理"
        subtitle={
          !loading && !error
            ? `待繳總額 $${pendingTotal.toLocaleString()}`
            : undefined
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
            searchPlaceholder="搜尋社團名稱或代碼..."
          />

          {/* batch action toolbar overlays filter bar to avoid layout shift */}
          {selected.size > 0 && (
            <div className="absolute inset-0 z-10 flex items-center gap-3 border-b border-border bg-white px-5 rounded-t-lg">
              <span className="text-sm font-medium text-neutral-700">
                已選取 {selected.size} 筆
              </span>
              {selectedPendingCount > 0 && (
                <button
                  className="rounded-full border border-primary/20 bg-white px-3 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                  onClick={() => setBatchConfirm({ status: "paid" })}
                >
                  批次標記已繳 ({selectedPendingCount})
                </button>
              )}
              {selectedPaidCount > 0 && (
                <button
                  className="rounded-full border border-primary/20 bg-white px-3 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
                  onClick={() => setBatchConfirm({ status: "returned" })}
                >
                  批次退還 ({selectedPaidCount})
                </button>
              )}
              <button
                className="ml-auto text-xs text-neutral-400 hover:text-neutral-600"
                onClick={() => setSelected(new Set())}
              >
                取消選取
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
            emptyMessage="沒有找到符合條件的保證金紀錄"
            emptyColSpan={8}
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
            ? "確認標記已繳？"
            : "確認退還保證金？"
        }
        description={
          confirmTarget
            ? `即將更新社團「${confirmTarget.clubLabel}」的保證金狀態`
            : undefined
        }
        confirmLabel={
          confirmTarget?.newStatus === "paid" ? "標記已繳" : "確認退還"
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
            ? `批次標記 ${selected.size} 筆為已繳？`
            : `批次退還 ${selected.size} 筆保證金？`
        }
        description="此操作將一次更新所選取的所有紀錄，請確認無誤"
        confirmLabel="確認執行"
      />

      {/* notes edit modal */}
      <FormModal
        open={!!notesTarget}
        onClose={() => setNotesTarget(null)}
        onSubmit={handleNotesSave}
        title="編輯備註"
        submitLabel="儲存備註"
        loading={notesLoading}
      >
        <FormField
          as="textarea"
          label="備註"
          value={notesTarget?.notes ?? ""}
          onChange={(e) =>
            setNotesTarget((prev) =>
              prev ? { ...prev, notes: e.target.value } : null,
            )
          }
          placeholder="輸入備註內容..."
          className="min-h-[120px]"
        />
      </FormModal>
    </>
  );
}
