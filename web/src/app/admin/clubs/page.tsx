"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  ArrowUpTrayIcon,
  PencilSquareIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  AdminPageHeader,
  AdminFilterBar,
  AdminTableSkeleton,
  AdminEmptyState,
  AdminErrorState,
  FullPageFormModal,
  FormField,
  type TabItem,
} from "@/components/admin/shared";
import { adminFetch } from "@/lib/admin-utils";

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

interface ImportResult {
  created: number;
  updated: number;
}

export default function ClubsPage() {
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
  const [importData, setImportData] = useState<Record<string, unknown>[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchClubs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ clubs: Club[] }>("/api/admin/clubs");
      setClubs(data.clubs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生未知錯誤");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  const categoryTabs: TabItem[] = useMemo(() => {
    const cats = Array.from(new Set(clubs.map((c) => c.category))).sort();
    return [
      { key: "all", label: "全部" },
      ...cats.map((c) => ({ key: c, label: c })),
    ];
  }, [clubs]);

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
  const openEdit = (club: Club) => {
    setEditClub(club);
    setEditForm(clubToForm(club));
    setEditError(null);
    setEditOpen(true);
  };

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
      await fetchClubs();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "儲存失敗");
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
    setImportData([]);
    setImportError(null);
    setImportResult(null);
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
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed.clubs;
      if (!Array.isArray(arr) || arr.length === 0) {
        setImportError("JSON 檔案中找不到有效的社團資料陣列");
        return;
      }
      setImportData(arr);
      setImportStep("preview");
    } catch {
      setImportError("JSON 格式解析失敗，請確認檔案格式正確");
    }
  };

  const handleImportConfirm = async () => {
    setImportLoading(true);
    setImportError(null);
    try {
      const result = await adminFetch<ImportResult>(
        "/api/admin/clubs/import",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clubs: importData }),
        },
      );
      setImportResult(result);
      setImportStep("result");
      await fetchClubs();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "匯入失敗");
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="社團名單"
        count={loading || error ? undefined : clubs.length}
        action={
          <Button onClick={openImport}>
            <ArrowUpTrayIcon className="h-4 w-4" />
            匯入名單
          </Button>
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
            searchPlaceholder="搜尋社團..."
          />

          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="bg-neutral-100 text-neutral-500">
                <th className="h-10 px-5 font-medium">社團名稱</th>
                <th className="h-10 px-3 font-medium">分類</th>
                <th className="h-10 px-3 font-medium">社團代碼</th>
                <th className="h-10 px-3 font-medium">Email</th>
                <th className="h-10 px-3 font-medium">狀態</th>
                <th className="h-10 px-5 text-right font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <AdminEmptyState
                  message="沒有找到符合條件的社團"
                  colSpan={6}
                />
              ) : (
                filtered.map((club) => (
                  <tr
                    key={club.id}
                    className="border-b border-border/50 last:border-0 hover:bg-primary/5"
                  >
                    <td className="h-12 px-5 font-medium text-neutral-950">
                      {club.name}
                    </td>
                    <td className="h-12 px-3 text-neutral-600">
                      {club.category}
                    </td>
                    <td className="h-12 px-3 font-mono text-[12px] text-neutral-400">
                      {club.category_code}
                    </td>
                    <td className="h-12 px-3 font-mono text-[12px] text-neutral-400">
                      {club.email || "—"}
                    </td>
                    <td className="h-12 px-3">
                      <Badge variant={club.is_active ? "success" : "neutral"}>
                        {club.is_active ? "啟用" : "停用"}
                      </Badge>
                    </td>
                    <td className="h-12 px-5 text-right">
                      <button
                        onClick={() => openEdit(club)}
                        title="編輯"
                        className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Card>
      )}

      {/* ── Edit Club Modal ──────────────────────────────────────── */}
      <FullPageFormModal
        open={editOpen}
        onClose={closeEdit}
        onSubmit={handleEditSubmit}
        title="編輯社團"
        submitLabel="儲存變更"
        loading={editLoading}
      >
        {editError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {editError}
          </div>
        )}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="社團名稱"
            required
            value={editForm.name}
            onChange={(e) =>
              updateField("name", (e.target as HTMLInputElement).value)
            }
          />
          <FormField
            label="英文名稱"
            value={editForm.name_en}
            onChange={(e) =>
              updateField("name_en", (e.target as HTMLInputElement).value)
            }
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="分類"
            required
            value={editForm.category}
            onChange={(e) =>
              updateField("category", (e.target as HTMLInputElement).value)
            }
          />
          <FormField
            label="Email"
            type="email"
            value={editForm.email}
            onChange={(e) =>
              updateField("email", (e.target as HTMLInputElement).value)
            }
          />
        </div>
        <FormField
          label="簡介"
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
            label="網站"
            type="url"
            value={editForm.website_url}
            placeholder="https://..."
            onChange={(e) =>
              updateField("website_url", (e.target as HTMLInputElement).value)
            }
          />
          <FormField
            label="狀態"
            as="select"
            value={editForm.is_active}
            options={[
              { value: "true", label: "啟用" },
              { value: "false", label: "停用" },
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
        onClose={importLoading ? () => {} : closeImport}
        title="匯入社團名單"
      >
        {importStep === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              請選擇 JSON 格式的社團名單檔案。檔案格式可為陣列或包含{" "}
              <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs font-mono">
                clubs
              </code>{" "}
              欄位的物件。
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-neutral-300 px-6 py-10 text-neutral-500 transition-colors hover:border-primary hover:text-primary"
            >
              <DocumentArrowUpIcon className="h-10 w-10" />
              <span className="text-sm font-medium">點擊選擇檔案</span>
              <span className="text-xs text-neutral-400">
                支援 .json 格式
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
                已讀取檔案：{importFile?.name}
              </p>
              <p className="mt-1 text-sm text-blue-600">
                共 {importData.length} 筆社團資料準備匯入
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="sticky top-0 bg-neutral-100 text-neutral-500">
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">名稱</th>
                    <th className="px-3 py-2 font-medium">分類</th>
                  </tr>
                </thead>
                <tbody>
                  {importData.slice(0, 50).map((item, i) => (
                    <tr
                      key={i}
                      className="border-t border-border/50"
                    >
                      <td className="px-3 py-1.5 text-neutral-400">
                        {i + 1}
                      </td>
                      <td className="px-3 py-1.5 text-neutral-700">
                        {(item.name as string) || "—"}
                      </td>
                      <td className="px-3 py-1.5 text-neutral-500">
                        {(item.category as string) || "—"}
                      </td>
                    </tr>
                  ))}
                  {importData.length > 50 && (
                    <tr className="border-t border-border/50">
                      <td
                        colSpan={3}
                        className="px-3 py-1.5 text-center text-neutral-400"
                      >
                        ⋯ 還有 {importData.length - 50} 筆
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                重新選擇
              </button>
              <Button onClick={handleImportConfirm} disabled={importLoading}>
                {importLoading ? "匯入中…" : "確認匯入"}
              </Button>
            </div>
          </div>
        )}

        {importStep === "result" && importResult && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircleIcon className="h-12 w-12 text-green-500" />
              <p className="text-lg font-semibold text-neutral-950">
                匯入完成
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-neutral-50 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-primary">
                  {importResult.created}
                </p>
                <p className="mt-1 text-xs text-neutral-500">新增社團</p>
              </div>
              <div className="rounded-lg border border-border bg-neutral-50 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {importResult.updated}
                </p>
                <p className="mt-1 text-xs text-neutral-500">更新社團</p>
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
