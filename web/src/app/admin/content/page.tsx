"use client";

import { useState, useEffect, useCallback } from "react";
import { DocumentTextIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/card";
import {
  AdminPageHeader,
  AdminSpinnerLoading,
  AdminErrorState,
  AdminEmptyState,
  FullPageFormModal,
  FormField,
  MarkdownEditor,
  AdminErrorBanner,
} from "@/components/admin/shared";
import { formatTimestamp, adminFetch } from "@/lib/admin-utils";

interface SiteContent {
  id: string;
  title: string;
  content_markdown: string;
  metadata?: Record<string, unknown>;
  updated_at: unknown;
  updated_by: string;
}

function getDescription(page: SiteContent): string {
  if (page.metadata && typeof page.metadata.description === "string") {
    return page.metadata.description;
  }
  const raw = page.content_markdown ?? "";
  const trimmed = raw.replace(/^#+\s.*/m, "").trim();
  return trimmed.length > 50 ? trimmed.slice(0, 50) + "…" : trimmed || "—";
}

export default function ContentPage() {
  const [pages, setPages] = useState<SiteContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // edit modal
  const [editTarget, setEditTarget] = useState<{
    id: string;
    title: string;
    content_markdown: string;
  } | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ content: SiteContent[] }>(
        "/api/admin/content",
      );
      setPages(data.content || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入內容資料");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const openEdit = (page: SiteContent) => {
    setEditError(null);
    setEditTarget({
      id: page.id,
      title: page.title,
      content_markdown: page.content_markdown,
    });
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditLoading(true);
    setEditError(null);
    try {
      await adminFetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          title: editTarget.title,
          content_markdown: editTarget.content_markdown,
        }),
      });
      setEditTarget(null);
      setSuccessId(editTarget.id);
      setTimeout(() => setSuccessId(null), 2500);
      await fetchContent();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "儲存失敗，請稍後再試");
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="網站內容"
        subtitle="管理網站靜態頁面內容，使用 Markdown 編輯器"
        count={!loading && !error ? pages.length : undefined}
      />

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center gap-4 animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-neutral-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 rounded bg-neutral-200" />
                  <div className="h-3 w-48 rounded bg-neutral-100" />
                </div>
                <div className="h-8 w-16 rounded-full bg-neutral-100" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <div className="mt-6">
          <AdminErrorState message={error} onRetry={fetchContent} />
        </div>
      ) : pages.length === 0 ? (
        <div className="mt-6">
          <AdminEmptyState message="尚無網站內容" />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {pages.map((page) => (
            <Card key={page.id} hoverable>
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                  <DocumentTextIcon className="h-5 w-5 text-neutral-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-neutral-950">
                      {page.title}
                    </h3>
                    {successId === page.id && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-600">
                        已儲存
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-neutral-500">
                    {getDescription(page)}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-[12px] text-neutral-400">
                    更新於{" "}
                    {formatTimestamp(
                      page.updated_at as Parameters<typeof formatTimestamp>[0],
                    )}
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    由 {page.updated_by}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(page)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" />
                  編輯
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* edit content modal */}
      <FullPageFormModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        onSubmit={handleEditSave}
        title="編輯頁面內容"
        submitLabel="儲存變更"
        loading={editLoading}
        wide
      >
        {editError && <AdminErrorBanner message={editError} />}
        <FormField
          label="標題"
          required
          value={editTarget?.title ?? ""}
          onChange={(e) =>
            setEditTarget((prev) =>
              prev ? { ...prev, title: e.target.value } : null,
            )
          }
          placeholder="頁面標題"
        />
        <MarkdownEditor
          value={editTarget?.content_markdown ?? ""}
          onChange={(v) =>
            setEditTarget((prev) =>
              prev ? { ...prev, content_markdown: v } : null,
            )
          }
        />
      </FullPageFormModal>
    </>
  );
}
