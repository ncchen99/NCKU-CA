"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import {
  PlusIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AdminPageHeader,
  AdminFilterBar,
  AdminTableSkeleton,
  AdminErrorState,
  AdminErrorBanner,
  FullPageFormModal,
  FormField,
  ConfirmDialog,
  AdminDataTable,
  adminSortableHeader,
  compareZh,
  type TabItem,
} from "@/components/admin/shared";
import { formatTimestamp, adminFetch, timestampToMs } from "@/lib/admin-utils";

type FormStatus = "all" | "open" | "closed" | "draft";

interface FormFieldDef {
  id: string;
  label: string;
  type: string;
  required?: boolean;
}

interface DepositPolicy {
  required: boolean;
  amount?: number;
  binding_mode: "linked_to_response" | "independent";
  refund_rule?: string;
}

interface Form {
  id: string;
  title: string;
  description: string;
  form_type:
    | "expo_registration"
    | "winter_association_registration"
    | "general_registration"
    | "attendance_survey"
    | "custom";
  status: "draft" | "open" | "closed";
  settings: Record<string, unknown>;
  deposit_policy: DepositPolicy;
  fields: FormFieldDef[];
  created_by: string;
  created_at: unknown;
  closes_at?: unknown;
  responseCount?: number;
}

interface FormDraft {
  title: string;
  description: string;
  form_type: Form["form_type"];
  status: Form["status"];
  deposit_required: boolean;
  deposit_amount: string;
  closes_at: string;
}

const EMPTY_DRAFT: FormDraft = {
  title: "",
  description: "",
  form_type: "general_registration",
  status: "draft",
  deposit_required: false,
  deposit_amount: "",
  closes_at: "",
};

const formTypeLabels: Record<string, string> = {
  expo_registration: "博覽會報名",
  winter_association_registration: "寒聯會報名",
  general_registration: "一般報名",
  attendance_survey: "出席調查",
  custom: "自訂表單",
};

const formTypeOptions = Object.entries(formTypeLabels).map(([value, label]) => ({
  value,
  label,
}));

const statusOptions = [
  { value: "draft", label: "草稿" },
  { value: "open", label: "開放中" },
  { value: "closed", label: "已關閉" },
];

const tabs: TabItem<FormStatus>[] = [
  { key: "all", label: "全部" },
  { key: "open", label: "開放中" },
  { key: "closed", label: "已關閉" },
  { key: "draft", label: "草稿" },
];

const statusConfig: Record<
  string,
  { variant: "success" | "neutral" | "warning"; label: string }
> = {
  open: { variant: "success", label: "開放中" },
  closed: { variant: "neutral", label: "已關閉" },
  draft: { variant: "warning", label: "草稿" },
};

export default function FormsPage() {
  const [activeTab, setActiveTab] = useState<FormStatus>("all");
  const [search, setSearch] = useState("");
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT);

  const [deleteTarget, setDeleteTarget] = useState<Form | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<Form[]>("/api/admin/forms");

      const formsWithCounts = await Promise.all(
        data.map(async (form) => {
          try {
            const responses = await adminFetch<unknown[]>(
              `/api/admin/forms/${form.id}/responses`,
            );
            return {
              ...form,
              responseCount: Array.isArray(responses) ? responses.length : 0,
            };
          } catch {
            return { ...form, responseCount: 0 };
          }
        }),
      );

      setForms(formsWithCounts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入資料時發生錯誤");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const filtered = forms.filter((f) => {
    if (activeTab !== "all" && f.status !== activeTab) return false;
    if (search && !f.title.includes(search)) return false;
    return true;
  });

  function openCreateModal() {
    setEditingForm(null);
    setDraft(EMPTY_DRAFT);
    setModalError(null);
    setModalOpen(true);
  }

  const openEditModal = useCallback(async (form: Form) => {
    setModalError(null);
    setModalOpen(true);
    setModalLoading(true);
    try {
      const full = await adminFetch<Form>(`/api/admin/forms/${form.id}`);
      setEditingForm(full);
      setDraft({
        title: full.title,
        description: full.description ?? "",
        form_type: full.form_type,
        status: full.status,
        deposit_required: full.deposit_policy?.required ?? false,
        deposit_amount: full.deposit_policy?.amount?.toString() ?? "",
        closes_at: closesAtToInput(full.closes_at),
      });
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "載入表單資料失敗");
    } finally {
      setModalLoading(false);
    }
  }, []);

  function closesAtToInput(ts: unknown): string {
    if (!ts) return "";
    if (typeof ts === "string") {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "";
      return d.toISOString().slice(0, 16);
    }
    if (
      typeof ts === "object" &&
      ts !== null &&
      "_seconds" in (ts as Record<string, unknown>)
    ) {
      const d = new Date(
        (ts as { _seconds: number })._seconds * 1000,
      );
      return d.toISOString().slice(0, 16);
    }
    return "";
  }

  async function handleSubmit() {
    if (!draft.title.trim()) return;
    setModalLoading(true);
    setModalError(null);
    try {
      const body: Record<string, unknown> = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        form_type: draft.form_type,
        status: draft.status,
        deposit_policy: {
          required: draft.deposit_required,
          ...(draft.deposit_required && draft.deposit_amount
            ? { amount: Number(draft.deposit_amount) }
            : {}),
          binding_mode: editingForm?.deposit_policy?.binding_mode ?? "independent",
        },
        ...(draft.closes_at ? { closes_at: draft.closes_at } : {}),
      };

      if (editingForm) {
        await adminFetch(`/api/admin/forms/${editingForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await adminFetch<{ id: string }>("/api/admin/forms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      setModalOpen(false);
      setEditingForm(null);
      await fetchForms();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "操作失敗");
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminFetch(`/api/admin/forms/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      await fetchForms();
    } catch (err) {
      alert(err instanceof Error ? err.message : "刪除失敗");
    } finally {
      setDeleteLoading(false);
    }
  }

  function updateDraft(patch: Partial<FormDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  const formColumns = useMemo<ColumnDef<Form>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => adminSortableHeader(column, "表單名稱"),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.original.title),
            String(rowB.original.title),
          ),
        cell: ({ row }) => (
          <span className="font-medium text-neutral-950">{row.original.title}</span>
        ),
        meta: { thClassName: "px-5", tdClassName: "px-5" },
      },
      {
        accessorKey: "form_type",
        header: ({ column }) => adminSortableHeader(column, "類型"),
        sortingFn: (rowA, rowB) =>
          compareZh(
            formTypeLabels[rowA.original.form_type] ?? rowA.original.form_type,
            formTypeLabels[rowB.original.form_type] ?? rowB.original.form_type,
          ),
        cell: ({ row }) => (
          <span className="text-neutral-600">
            {formTypeLabels[row.original.form_type] ?? row.original.form_type}
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
        accessorKey: "responseCount",
        header: ({ column }) => adminSortableHeader(column, "回覆數"),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="font-mono text-neutral-600">
            {row.original.responseCount ?? 0}
          </span>
        ),
      },
      {
        id: "closes_at",
        accessorFn: (row) => timestampToMs(row.closes_at),
        header: ({ column }) => adminSortableHeader(column, "截止日期"),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="text-neutral-400">
            {formatTimestamp(
              row.original.closes_at as Parameters<typeof formatTimestamp>[0],
            )}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const form = row.original;
          return (
            <div className="inline-flex items-center gap-1">
              <Link
                href={`/admin/forms/${form.id}`}
                title="檢視"
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => openEditModal(form)}
                title="編輯"
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(form)}
                title="刪除"
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          );
        },
        meta: { thClassName: "px-5 text-right", tdClassName: "px-5 text-right" },
      },
    ],
    [openEditModal],
  );

  return (
    <>
      <AdminPageHeader
        title="表單管理"
        count={loading ? undefined : forms.length}
        action={
          <Button onClick={openCreateModal}>
            <PlusIcon className="h-4 w-4" />
            建立表單
          </Button>
        }
      />

      {error && !loading && <AdminErrorBanner message={error} />}

      <Card className="mt-6">
        <AdminFilterBar<FormStatus>
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="搜尋表單..."
        />

        {loading ? (
          <div className="overflow-hidden">
            <AdminTableSkeleton rows={5} columns={[192, 80, 56, 48, 80, 64]} />
          </div>
        ) : error ? (
          <AdminErrorState message={error} onRetry={fetchForms} />
        ) : (
          <AdminDataTable
            data={filtered}
            columns={formColumns}
            getRowId={(row) => row.id}
            emptyMessage="沒有找到符合條件的表單"
            emptyColSpan={6}
          />
        )}
      </Card>

      {/* Create / Edit Modal */}
      <FullPageFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingForm(null);
        }}
        onSubmit={handleSubmit}
        title={editingForm ? "編輯表單" : "建立表單"}
        submitLabel={editingForm ? "更新" : "建立"}
        loading={modalLoading}
      >
        {modalError && <AdminErrorBanner message={modalError} />}

        <FormField
          label="表單名稱"
          required
          value={draft.title}
          onChange={(e) =>
            updateDraft({
              title: (e.target as HTMLInputElement).value,
            })
          }
          placeholder="請輸入表單名稱"
        />

        <FormField
          as="textarea"
          label="描述"
          value={draft.description}
          onChange={(e) =>
            updateDraft({
              description: (e.target as HTMLTextAreaElement).value,
            })
          }
          placeholder="表單說明（選填）"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            as="select"
            label="表單類型"
            required
            value={draft.form_type}
            onChange={(e) =>
              updateDraft({
                form_type: (e.target as HTMLSelectElement)
                  .value as Form["form_type"],
              })
            }
            options={formTypeOptions}
          />

          <FormField
            as="select"
            label="狀態"
            required
            value={draft.status}
            onChange={(e) =>
              updateDraft({
                status: (e.target as HTMLSelectElement)
                  .value as Form["status"],
              })
            }
            options={statusOptions}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            as="select"
            label="需要保證金"
            value={draft.deposit_required ? "yes" : "no"}
            onChange={(e) =>
              updateDraft({
                deposit_required:
                  (e.target as HTMLSelectElement).value === "yes",
              })
            }
            options={[
              { value: "no", label: "否" },
              { value: "yes", label: "是" },
            ]}
          />

          {draft.deposit_required && (
            <FormField
              label="保證金金額"
              type="number"
              min={0}
              value={draft.deposit_amount}
              onChange={(e) =>
                updateDraft({
                  deposit_amount: (e.target as HTMLInputElement).value,
                })
              }
              placeholder="輸入金額"
              hint="單位：新台幣"
            />
          )}
        </div>

        <FormField
          label="截止時間"
          type="datetime-local"
          value={draft.closes_at}
          onChange={(e) =>
            updateDraft({
              closes_at: (e.target as HTMLInputElement).value,
            })
          }
          hint="留空表示無截止日期"
        />
      </FullPageFormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={`確定要刪除「${deleteTarget?.title}」嗎？`}
        description="此操作無法復原，表單及其所有回覆資料將被永久刪除。"
        confirmLabel="刪除"
        variant="danger"
        loading={deleteLoading}
      />
    </>
  );
}
