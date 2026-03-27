"use client";

import { useState, useEffect, useCallback } from "react";
import { DocumentTextIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/card";
import {
  AdminPageHeader,
  AdminErrorState,
  AdminEmptyState,
  FullPageFormModal,
  FormField,
  MarkdownEditor,
  AdminErrorBanner,
} from "@/components/admin/shared";
import { formatTimestamp, adminFetch } from "@/lib/admin-utils";
import { toast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

interface SiteContent {
  id: string;
  title: string;
  content_markdown: string;
  metadata?: Record<string, unknown>;
  updated_at: unknown;
  updated_by: string;
  updated_by_display_name?: string;
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
  const t = useTranslations("adminContent");
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

  const fetchContent = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
    try {
      const data = await adminFetch<{ content: SiteContent[] }>(
        "/api/admin/content",
      );
      setPages(data.content || []);
    } catch (err) {
      if (!background) {
        setError(err instanceof Error ? err.message : t("error.loadFailed"));
      } else {
        toast(err instanceof Error ? err.message : t("error.loadFailedToast"), "error");
      }
    } finally {
      if (!background) setLoading(false);
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
    const pageId = editTarget.id.trim();
    if (!pageId) {
      setEditError(t("error.pageIdRequired"));
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      await adminFetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: pageId,
          title: editTarget.title,
          content_markdown: editTarget.content_markdown,
        }),
      });
      setEditTarget(null);
      setSuccessId(pageId);
      setTimeout(() => setSuccessId(null), 2500);
      toast(t("toast.saved"), "success");
      await fetchContent(true);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : t("error.saveFailed"));
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
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
          <AdminEmptyState message={t("empty")} />
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
                        {t("savedBadge")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-neutral-500">
                    {getDescription(page)}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-[12px] text-neutral-400">
                    {t("updatedAt")} {" "}
                    {formatTimestamp(
                      page.updated_at as Parameters<typeof formatTimestamp>[0],
                    )}
                  </p>
                  <p className="text-[12px] text-neutral-400">
                    {t("updatedBy")} {" "}
                    {page.updated_by_display_name ?? page.updated_by}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(page)}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  <PencilSquareIcon className="h-3.5 w-3.5" />
                  {t("actions.edit")}
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
        title={t("modal.title")}
        submitLabel={t("modal.submit")}
        loading={editLoading}
        wide
      >
        {editError && <AdminErrorBanner message={editError} />}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label={t("form.titleLabel")}
            required
            value={editTarget?.title ?? ""}
            onChange={(e) =>
              setEditTarget((prev) =>
                prev ? { ...prev, title: e.target.value } : null,
              )
            }
            placeholder={t("form.titlePlaceholder")}
          />
          <FormField
            label={t("form.pageIdLabel")}
            required
            value={editTarget?.id ?? ""}
            onChange={(e) =>
              setEditTarget((prev) =>
                prev ? { ...prev, id: e.target.value } : null,
              )
            }
            placeholder={t("form.pageIdPlaceholder")}
          />
        </div>
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
