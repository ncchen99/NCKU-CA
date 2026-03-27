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
import { FormFieldEditor } from "@/components/admin/form-field-editor";
import { FormTemplatePicker } from "@/components/admin/form-template-picker";
import { formatTimestamp, adminFetch, timestampToMs } from "@/lib/admin-utils";
import { toast } from "@/components/ui/use-toast";
import type { FormField as FormFieldType } from "@/types";
import type { FormTemplate } from "@/lib/form-templates";
import { useTranslations } from "next-intl";

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
  deposit_binding_mode: "linked_to_response" | "independent";
  closes_at: string;
  fields: FormFieldType[];
}

const EMPTY_DRAFT: FormDraft = {
  title: "",
  description: "",
  form_type: "general_registration",
  status: "draft",
  deposit_required: false,
  deposit_amount: "",
  deposit_binding_mode: "independent",
  closes_at: "",
  fields: [],
};

export default function FormsPage() {
  const t = useTranslations("adminForms");
  const [activeTab, setActiveTab] = useState<FormStatus>("all");
  const [search, setSearch] = useState("");
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ── Modal State ── */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [formFetching, setFormFetching] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [draft, setDraft] = useState<FormDraft>(EMPTY_DRAFT);

  /* ── Template Picker Step ── */
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  /* ── Delete ── */
  const [deleteTarget, setDeleteTarget] = useState<Form | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ── Active tab for form modal ── */
  const [formModalTab, setFormModalTab] = useState<"basic" | "fields">("basic");

  const formTypeLabels: Record<string, string> = useMemo(
    () => ({
      expo_registration: t("formType.expoRegistration"),
      winter_association_registration: t("formType.winterAssociationRegistration"),
      general_registration: t("formType.generalRegistration"),
      attendance_survey: t("formType.attendanceSurvey"),
      custom: t("formType.custom"),
    }),
    [t],
  );

  const formTypeOptions = useMemo(
    () => Object.entries(formTypeLabels).map(([value, label]) => ({ value, label })),
    [formTypeLabels],
  );

  const statusOptions = useMemo(
    () => [
      { value: "draft", label: t("status.draft") },
      { value: "open", label: t("status.open") },
      { value: "closed", label: t("status.closed") },
    ],
    [t],
  );

  const tabs: TabItem<FormStatus>[] = useMemo(
    () => [
      { key: "all", label: t("tabs.all") },
      { key: "open", label: t("tabs.open") },
      { key: "closed", label: t("tabs.closed") },
      { key: "draft", label: t("tabs.draft") },
    ],
    [t],
  );

  const statusConfig: Record<string, { variant: "success" | "neutral" | "warning"; label: string }> = useMemo(
    () => ({
      open: { variant: "success", label: t("status.open") },
      closed: { variant: "neutral", label: t("status.closed") },
      draft: { variant: "warning", label: t("status.draft") },
    }),
    [t],
  );

  const fetchForms = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
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
      if (!background) {
        setError(err instanceof Error ? err.message : t("error.loadFailed"));
      } else {
        toast(err instanceof Error ? err.message : t("error.loadFailedToast"), "error");
      }
      throw err;
    } finally {
      if (!background) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchForms().catch(() => {
      // Error state is handled in fetchForms.
    });
  }, [fetchForms]);

  const filtered = forms.filter((f) => {
    if (activeTab !== "all" && f.status !== activeTab) return false;
    if (search && !f.title.includes(search)) return false;
    return true;
  });

  /* ── Template handler ── */
  function handleTemplateSelect(template: FormTemplate) {
    const fieldsWithOrder: FormFieldType[] = template.fields.map((f, idx) => ({
      ...f,
      order: idx,
    }));

    setDraft({
      title: "",
      description: template.description,
      form_type: template.form_type as Form["form_type"],
      status: "draft",
      deposit_required: template.deposit_required,
      deposit_amount: template.deposit_amount?.toString() ?? "",
      deposit_binding_mode: template.binding_mode,
      closes_at: "",
      fields: fieldsWithOrder,
    });

    setShowTemplatePicker(false);
    setModalOpen(true);
    setFormModalTab("basic");
  }

  function handleTemplateSkip() {
    setDraft(EMPTY_DRAFT);
    setShowTemplatePicker(false);
    setModalOpen(true);
    setFormModalTab("basic");
  }

  /* ── Create modal ── */
  function openCreateModal() {
    setEditingForm(null);
    setDraft(EMPTY_DRAFT);
    setModalError(null);
    setFormModalTab("basic");
    // Show template picker for new forms
    setShowTemplatePicker(true);
  }

  const openEditModal = useCallback(async (form: Form) => {
    setModalError(null);
    setFormModalTab("basic");
    setShowTemplatePicker(false);
    setModalOpen(true);
    setFormFetching(true);
    try {
      const full = await adminFetch<Form>(`/api/admin/forms/${form.id}`);
      setEditingForm(full);

      const rawFields = (full.fields || []) as unknown as Record<string, unknown>[];
      const typedFields: FormFieldType[] = rawFields.map(
        (f: Record<string, unknown>, idx: number) => ({
          id: (f.id as string) ?? `field_${idx}`,
          type: (f.type as FormFieldType["type"]) ?? "text",
          label: (f.label as string) ?? "",
          placeholder: f.placeholder as string | undefined,
          required: (f.required as boolean) ?? false,
          options: f.options as string[] | undefined,
          validation: f.validation as FormFieldType["validation"],
          depends_on: f.depends_on as FormFieldType["depends_on"],
          default_from_user: f.default_from_user as string | undefined,
          read_only_if_prefilled: f.read_only_if_prefilled as boolean | undefined,
          order: typeof f.order === "number" ? f.order : idx,
        }),
      );

      setDraft({
        title: full.title,
        description: full.description ?? "",
        form_type: full.form_type,
        status: full.status,
        deposit_required: full.deposit_policy?.required ?? false,
        deposit_amount: full.deposit_policy?.amount?.toString() ?? "",
        deposit_binding_mode: full.deposit_policy?.binding_mode ?? "independent",
        closes_at: closesAtToInput(full.closes_at),
        fields: typedFields,
      });
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("error.loadFormFailed"));
    } finally {
      setFormFetching(false);
    }
  }, [t]);

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
    if (!draft.title.trim()) {
      setModalError(t("error.titleRequired"));
      return;
    }
    setModalLoading(true);
    setModalError(null);
    try {
      // Sort and clean fields
      const cleanFields = [...draft.fields]
        .sort((a, b) => a.order - b.order)
        .map((f, idx) => ({
          ...f,
          order: idx,
        }));

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
          binding_mode: draft.deposit_binding_mode,
        },
        fields: cleanFields,
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

      await fetchForms(true);

      setModalOpen(false);
      setEditingForm(null);
      toast(editingForm ? t("toast.updated") : t("toast.created"), "success");
    } catch (err) {
      setModalError(err instanceof Error ? err.message : t("error.actionFailed"));
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
      toast(t("toast.deleted"), "success");
      await fetchForms(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error.deleteFailed"), "error");
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
        header: ({ column }) => adminSortableHeader(column, t("table.title")),
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
        header: ({ column }) => adminSortableHeader(column, t("table.type")),
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
        header: ({ column }) => adminSortableHeader(column, t("table.status")),
        sortingFn: (rowA, rowB) =>
          compareZh(rowA.original.status, rowB.original.status),
        cell: ({ row }) => {
          const badge = statusConfig[row.original.status];
          return <Badge variant={badge.variant}>{badge.label}</Badge>;
        },
      },
      {
        id: "fieldCount",
        header: ({ column }) => adminSortableHeader(column, t("table.fieldCount")),
        accessorFn: (row) => row.fields?.length ?? 0,
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="font-mono text-neutral-600">
            {row.original.fields?.length ?? 0}
          </span>
        ),
      },
      {
        accessorKey: "responseCount",
        header: ({ column }) => adminSortableHeader(column, t("table.responseCount")),
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
        header: ({ column }) => adminSortableHeader(column, t("table.closesAt")),
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
                title={t("actions.view")}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <EyeIcon className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => openEditModal(form)}
                title={t("actions.edit")}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(form)}
                title={t("actions.delete")}
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
    [formTypeLabels, openEditModal, statusConfig, t],
  );

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        count={loading ? undefined : forms.length}
        action={
          <Button onClick={openCreateModal}>
            <PlusIcon className="h-4 w-4" />
            {t("actions.create")}
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
          searchPlaceholder={t("searchPlaceholder")}
        />

        {loading ? (
          <div className="overflow-hidden">
            <AdminTableSkeleton rows={5} columns={[192, 80, 56, 48, 48, 80, 64]} />
          </div>
        ) : error ? (
          <AdminErrorState message={error} onRetry={fetchForms} />
        ) : (
          <AdminDataTable
            data={filtered}
            columns={formColumns}
            getRowId={(row) => row.id}
            emptyMessage={t("empty")}
            emptyColSpan={7}
          />
        )}
      </Card>

      {/* ── Template Picker (shown before Create modal) ── */}
      {showTemplatePicker && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40" />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
            <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-[0_0_0_1px_rgba(10,10,10,0.10),0_8px_40px_rgba(10,10,10,0.12)]">
              <FormTemplatePicker
                onSelect={handleTemplateSelect}
                onSkip={handleTemplateSkip}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Create / Edit Modal ── */}
      <FullPageFormModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingForm(null);
        }}
        onSubmit={handleSubmit}
        title={editingForm ? t("modal.editTitle") : t("modal.createTitle")}
        submitLabel={editingForm ? t("modal.update") : t("modal.create")}
        loading={modalLoading}
        isFetching={formFetching}
        wide
      >
        {modalError && <AdminErrorBanner message={modalError} />}

        {/* Inner tabs: basic / fields */}
        <div className="mb-4 flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
          <button
            type="button"
            onClick={() => setFormModalTab("basic")}
            className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${formModalTab === "basic"
              ? "bg-white text-neutral-950 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
              }`}
          >
            {t("modal.tabs.basic")}
          </button>
          <button
            type="button"
            onClick={() => setFormModalTab("fields")}
            className={`flex-1 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${formModalTab === "fields"
              ? "bg-white text-neutral-950 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
              }`}
          >
            {t("modal.tabs.fields")}
            {draft.fields.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {draft.fields.length}
              </span>
            )}
          </button>
        </div>

        {formModalTab === "basic" ? (
          <>
            <FormField
              label={t("form.title")}
              required
              value={draft.title}
              onChange={(e) =>
                updateDraft({
                  title: (e.target as HTMLInputElement).value,
                })
              }
              placeholder={t("form.titlePlaceholder")}
            />

            <FormField
              as="textarea"
              label={t("form.description")}
              value={draft.description}
              onChange={(e) =>
                updateDraft({
                  description: (e.target as HTMLTextAreaElement).value,
                })
              }
              placeholder={t("form.descriptionPlaceholder")}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                as="select"
                label={t("form.formType")}
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
                label={t("form.status")}
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
                label={t("form.depositRequired")}
                value={draft.deposit_required ? "yes" : "no"}
                onChange={(e) =>
                  updateDraft({
                    deposit_required:
                      (e.target as HTMLSelectElement).value === "yes",
                  })
                }
                options={[
                  { value: "no", label: t("common.no") },
                  { value: "yes", label: t("common.yes") },
                ]}
              />

              {draft.deposit_required && (
                <FormField
                  label={t("form.depositAmount")}
                  type="number"
                  min={0}
                  value={draft.deposit_amount}
                  onChange={(e) =>
                    updateDraft({
                      deposit_amount: (e.target as HTMLInputElement).value,
                    })
                  }
                  placeholder={t("form.depositAmountPlaceholder")}
                  hint={t("form.depositAmountHint")}
                />
              )}
            </div>

            {draft.deposit_required && (
              <FormField
                as="select"
                label={t("form.depositBindingMode")}
                value={draft.deposit_binding_mode}
                onChange={(e) =>
                  updateDraft({
                    deposit_binding_mode: (e.target as HTMLSelectElement)
                      .value as "linked_to_response" | "independent",
                  })
                }
                options={[
                  { value: "linked_to_response", label: t("form.binding.linked") },
                  { value: "independent", label: t("form.binding.independent") },
                ]}
                hint={t("form.bindingHint")}
              />
            )}

            <FormField
              label={t("form.closesAt")}
              type="datetime-local"
              value={draft.closes_at}
              onChange={(e) =>
                updateDraft({
                  closes_at: (e.target as HTMLInputElement).value,
                })
              }
              hint={t("form.closesAtHint")}
            />
          </>
        ) : (
          <FormFieldEditor
            fields={draft.fields}
            onChange={(fields) => updateDraft({ fields })}
          />
        )}
      </FullPageFormModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={t("delete.title", { title: deleteTarget?.title ?? "" })}
        description={t("delete.description")}
        confirmLabel={t("delete.confirm")}
        variant="danger"
        loading={deleteLoading}
      />
    </>
  );
}
