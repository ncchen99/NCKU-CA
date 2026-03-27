"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { DragEvent } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpTrayIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  PencilSquareIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import yaml from "js-yaml";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  AdminPageHeader,
  AdminFilterBar,
  AdminTableSkeleton,
  AdminErrorState,
  FullPageFormModal,
  FormField,
  AdminDataTable,
  adminSortableHeader,
  compareZh,
  type TabItem,
} from "@/components/admin/shared";
import { adminFetch } from "@/lib/admin-utils";
import { toast } from "@/components/ui/use-toast";
import { getAdminClubs } from "@/lib/client-firestore";
import { useTranslations } from "next-intl";

interface Club {
  id: string;
  name: string;
  name_en?: string;
  category: string;
  category_code: string;
  status?: string;
  email?: string;
  description?: string;
  is_active: boolean;
  import_source: string;
  imported_at: { _seconds: number } | string;
  website_url?: string;
}

interface ClubForm {
  name: string;
  name_en: string;
  category: string;
  email: string;
  description: string;
  is_active: string;
  website_url: string;
}

const emptyForm: ClubForm = {
  name: "",
  name_en: "",
  category: "",
  email: "",
  description: "",
  is_active: "true",
  website_url: "",
};

function clubToForm(club: Club): ClubForm {
  return {
    name: club.name,
    name_en: club.name_en ?? "",
    category: club.category,
    email: club.email ?? "",
    description: club.description ?? "",
    is_active: String(club.is_active),
    website_url: club.website_url ?? "",
  };
}

type ImportStep = "upload" | "preview" | "result";
type ImportFormat = "yaml" | "json";

interface ImportResult {
  created: number;
  updated: number;
}

export default function ClubsPage() {
  const t = useTranslations("adminClubs");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editClub, setEditClub] = useState<Club | null>(null);
  const [editForm, setEditForm] = useState<ClubForm>(emptyForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<ImportFormat>("yaml");
  const [importData, setImportData] = useState<Record<string, unknown>[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchClubs = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
    try {
      const data = await getAdminClubs();
      setClubs(data as Club[]);
    } catch (err) {
      if (!background) {
        setError(err instanceof Error ? err.message : t("error.unknown"));
      } else {
        toast(err instanceof Error ? err.message : t("error.loadFailed"), "error");
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const categoryTabs: TabItem[] = useMemo(() => {
    const cats = Array.from(new Set(clubs.map((c) => c.category))).sort();
    return [
      { key: "all", label: t("tabs.all") },
      ...cats.map((c) => ({ key: c, label: c })),
    ];
  }, [clubs, t]);

  const filtered = clubs.filter((c) => {
    if (activeTab !== "all" && c.category !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !c.name.toLowerCase().includes(q) &&
        !(c.name_en ?? "").toLowerCase().includes(q) &&
        !(c.email ?? "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  // ── Edit handlers ─────────────────────────────────────────────────
  const openEdit = useCallback((club: Club) => {
    setEditClub(club);
    setEditForm(clubToForm(club));
    setEditError(null);
    setEditOpen(true);
  }, []);

  const closeEdit = () => {
    setEditOpen(false);
    setEditClub(null);
  };

  const handleEditSubmit = async () => {
    if (!editClub) return;
    setEditLoading(true);
    setEditError(null);
    try {
      await adminFetch(`/api/admin/clubs/${editClub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          name_en: editForm.name_en || null,
          category: editForm.category,
          email: editForm.email || null,
          description: editForm.description || null,
          is_active: editForm.is_active === "true",
          website_url: editForm.website_url || null,
        }),
      });
      closeEdit();
      toast(t("toast.saved"), "success");
      await fetchClubs(true);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t("error.saveFailed"));
    } finally {
      setEditLoading(false);
    }
  };

  const updateField = (field: keyof ClubForm, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── Import handlers ───────────────────────────────────────────────
  const openImport = () => {
    setImportStep("upload");
    setImportFile(null);
    setImportFormat("yaml");
    setImportData([]);
    setImportError(null);
    setImportResult(null);
    setIsDragOver(false);
    setImportOpen(true);
  };

  const closeImport = () => {
    setImportOpen(false);
  };

  const handleFileSelect = async (file: File) => {
    setImportFile(file);
    setImportError(null);
    try {
      const text = await file.text();
      const lower = file.name.toLowerCase();
      const format: ImportFormat =
        lower.endsWith(".yaml") || lower.endsWith(".yml") ? "yaml" : "json";

      const parsed =
        format === "yaml"
          ? (yaml.load(text) as Record<string, unknown> | Record<string, unknown>[])
          : (JSON.parse(text) as Record<string, unknown> | Record<string, unknown>[]);
      const arr = Array.isArray(parsed) ? parsed : parsed.clubs;
      if (!Array.isArray(arr) || arr.length === 0) {
        setImportError(t("error.importDataMissing"));
        return;
      }
      setImportFormat(format);
      setImportData(arr);
      setImportStep("preview");
    } catch {
      setImportError(t("error.importParseFailed"));
    }
  };

  const handleUploadAreaDragOver = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleUploadAreaDragLeave = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleUploadAreaDrop = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFileSelect(file);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await fetch("/api/admin/clubs/export?format=yaml");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("error.exportFailed"));
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clubs_export_${new Date().toISOString().slice(0, 10)}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast(t("toast.yamlDownloaded"), "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error.exportFailed"), "error");
    } finally {
      setExportLoading(false);
    }
  };

  const clubColumns = useMemo<ColumnDef<Club>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => adminSortableHeader(column, t("table.name")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.original.name),
            String(rowB.original.name),
          ),
        cell: ({ row }) => (
          <span className="font-medium text-neutral-950">{row.original.name}</span>
        ),
        meta: { thClassName: "px-5", tdClassName: "px-5" },
      },
      {
        accessorKey: "category",
        header: ({ column }) => adminSortableHeader(column, t("table.category")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.original.category),
            String(rowB.original.category),
          ),
        cell: ({ row }) => (
          <span className="text-neutral-600">{row.original.category}</span>
        ),
      },
      {
        accessorKey: "category_code",
        header: ({ column }) => adminSortableHeader(column, t("table.code")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.original.category_code),
            String(rowB.original.category_code),
          ),
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-neutral-400">
            {row.original.category_code}
          </span>
        ),
      },
      {
        id: "email",
        accessorFn: (row) => row.email ?? "",
        header: ({ column }) => adminSortableHeader(column, t("table.email")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.getValue("email")),
            String(rowB.getValue("email")),
          ),
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-neutral-400">
            {row.original.email || t("common.notAvailable")}
          </span>
        ),
      },
      {
        id: "active",
        accessorFn: (row) => (row.is_active ? 1 : 0),
        header: ({ column }) => adminSortableHeader(column, t("table.status")),
        sortingFn: "basic",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "success" : "neutral"}>
            {row.original.is_active ? t("status.active") : t("status.inactive")}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-right">
            <button
              type="button"
              onClick={() => openEdit(row.original)}
              title={t("actions.edit")}
              className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
          </div>
        ),
        meta: { thClassName: "px-5 text-right", tdClassName: "px-5 text-right" },
      },
    ],
    [openEdit, t],
  );

  const importPreviewColumns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () => [
      {
        id: "rowIndex",
        header: "#",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-neutral-400">{row.index + 1}</span>
        ),
        meta: { thClassName: "px-3 py-2", tdClassName: "px-3 py-1.5" },
      },
      {
        accessorKey: "name",
        header: ({ column }) => adminSortableHeader(column, t("import.preview.name")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.getValue("name") ?? ""),
            String(rowB.getValue("name") ?? ""),
          ),
        cell: ({ row }) => (
          <span className="text-neutral-700">
            {(row.original.name as string) || t("common.notAvailable")}
          </span>
        ),
        meta: { thClassName: "px-3 py-2", tdClassName: "px-3 py-1.5" },
      },
      {
        accessorKey: "category",
        header: ({ column }) => adminSortableHeader(column, t("import.preview.category")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.getValue("category") ?? ""),
            String(rowB.getValue("category") ?? ""),
          ),
        cell: ({ row }) => (
          <span className="text-neutral-500">
            {(row.original.category as string) || t("common.notAvailable")}
          </span>
        ),
        meta: { thClassName: "px-3 py-2", tdClassName: "px-3 py-1.5" },
      },
    ],
    [t],
  );

  const handleImportConfirm = async () => {
    setImportLoading(true);
    setImportError(null);
    try {
      const result = await adminFetch<ImportResult>(
        "/api/admin/clubs/import",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clubs: importData, format: importFormat }),
        },
      );
      setImportResult(result);
      setImportStep("result");
      toast(t("toast.importSuccess"), "success");
      await fetchClubs(true);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t("error.importFailed"));
      toast(err instanceof Error ? err.message : t("error.importFailed"), "error");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        count={loading || error ? undefined : clubs.length}
        action={
          <>
            <Button
              variant="ghost"
              onClick={handleExport}
              disabled={exportLoading}
            >
              {exportLoading ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowDownTrayIcon className="h-4 w-4" />
              )}
              {exportLoading ? t("actions.exportLoading") : t("actions.exportYaml")}
            </Button>
            <Button onClick={openImport}>
              <ArrowUpTrayIcon className="h-4 w-4" />
              {t("actions.importList")}
            </Button>
          </>
        }
      />

      {loading ? (
        <Card className="mt-6 overflow-hidden">
          <AdminTableSkeleton
            rows={6}
            columns={[160, 64, 80, 120, 48]}
          />
        </Card>
      ) : error ? (
        <Card className="mt-6">
          <AdminErrorState message={error} onRetry={fetchClubs} />
        </Card>
      ) : (
        <Card className="mt-6">
          <AdminFilterBar
            tabs={categoryTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("searchPlaceholder")}
          />

          <AdminDataTable
            data={filtered}
            columns={clubColumns}
            getRowId={(row) => row.id}
            emptyMessage={t("empty")}
            emptyColSpan={6}
          />
        </Card>
      )}

      {/* ── Edit Club Modal ──────────────────────────────────────── */}
      <FullPageFormModal
        open={editOpen}
        onClose={closeEdit}
        onSubmit={handleEditSubmit}
        title={t("edit.title")}
        submitLabel={t("edit.submit")}
        loading={editLoading}
      >
        {editError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {editError}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label={t("edit.name")}
            required
            value={editForm.name}
            onChange={(e) =>
              updateField("name", (e.target as HTMLInputElement).value)
            }
          />
          <FormField
            label={t("edit.nameEn")}
            value={editForm.name_en}
            onChange={(e) =>
              updateField("name_en", (e.target as HTMLInputElement).value)
            }
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label={t("edit.category")}
            required
            value={editForm.category}
            onChange={(e) =>
              updateField("category", (e.target as HTMLInputElement).value)
            }
          />
          <FormField
            label={t("edit.email")}
            type="email"
            value={editForm.email}
            onChange={(e) =>
              updateField("email", (e.target as HTMLInputElement).value)
            }
          />
        </div>
        <FormField
          label={t("edit.description")}
          as="textarea"
          value={editForm.description}
          onChange={(e) =>
            updateField(
              "description",
              (e.target as HTMLTextAreaElement).value,
            )
          }
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label={t("edit.website")}
            type="url"
            value={editForm.website_url}
            placeholder="https://..."
            onChange={(e) =>
              updateField("website_url", (e.target as HTMLInputElement).value)
            }
          />
          <FormField
            label={t("edit.status")}
            as="select"
            value={editForm.is_active}
            options={[
              { value: "true", label: t("status.active") },
              { value: "false", label: t("status.inactive") },
            ]}
            onChange={(e) =>
              updateField("is_active", (e.target as HTMLSelectElement).value)
            }
          />
        </div>
      </FullPageFormModal>

      {/* ── Import Modal ─────────────────────────────────────────── */}
      <Modal
        open={importOpen}
        onClose={importLoading ? () => { } : closeImport}
        title={t("import.title")}
      >
        {importStep === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              {t("import.descriptionPrefix")} {" "}
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs font-mono">
                clubs
              </code>{" "}
              {t("import.descriptionSuffix")}
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".yaml,.yml,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={handleUploadAreaDragOver}
              onDragOver={handleUploadAreaDragOver}
              onDragLeave={handleUploadAreaDragLeave}
              onDrop={handleUploadAreaDrop}
              className={`flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 text-neutral-500 transition-colors ${isDragOver
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-neutral-300 hover:border-primary hover:text-primary"
                }`}
            >
              <DocumentArrowUpIcon className="h-10 w-10" />
              <span className="text-sm font-medium">{t("import.dropzoneTitle")}</span>
              <span className="text-xs text-neutral-400">
                {t("import.dropzoneHint")}
              </span>
            </button>

            {importError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {importError}
              </div>
            )}
          </div>
        )}

        {importStep === "preview" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
              <p className="text-sm font-medium text-blue-800">
                {t("import.loadedFile", { name: importFile?.name ?? "" })}
              </p>
              <p className="mt-1 text-sm text-blue-600">
                {t("import.previewSummary", {
                  format: importFormat.toUpperCase(),
                  count: importData.length,
                })}
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              <AdminDataTable
                data={importData.slice(0, 50)}
                columns={importPreviewColumns}
                getRowId={(_, i) => `import-${i}`}
                emptyMessage={t("import.previewEmpty")}
                emptyColSpan={3}
                classNames={{
                  table: "w-full text-left text-xs",
                  theadTr: "sticky top-0 bg-neutral-100 text-neutral-500",
                  th: "font-medium",
                  td: "",
                  bodyRow: "border-t border-border/50 hover:bg-transparent",
                }}
              />
              {importData.length > 50 && (
                <div className="border-t border-border/50 px-3 py-1.5 text-center text-xs text-neutral-400">
                  ⋯ 還有 {importData.length - 50} 筆
                </div>
              )}
            </div>

            {importError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {importError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setImportStep("upload");
                  setImportData([]);
                  setImportFile(null);
                  setImportError(null);
                }}
                disabled={importLoading}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-50"
              >
                {t("import.reselect")}
              </button>
              <Button onClick={handleImportConfirm} disabled={importLoading}>
                {importLoading ? t("import.importing") : t("import.confirm")}
              </Button>
            </div>
          </div>
        )}

        {importStep === "result" && importResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircleIcon className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-neutral-950">
                {t("import.done")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-neutral-50 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {importResult.created}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{t("import.created")}</p>
              </div>
              <div className="rounded-lg border border-border bg-neutral-50 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {importResult.updated}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{t("import.updated")}</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={closeImport}>完成</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
