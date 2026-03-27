"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AdminPageHeader,
  AdminFilterBar,
  AdminTableSkeleton,
  AdminErrorBanner,
  FullPageFormModal,
  FormField,
  MarkdownEditor,
  ConfirmDialog,
  AdminDataTable,
  adminSortableHeader,
  compareZh,
  type TabItem,
} from "@/components/admin/shared";
import { formatTimestamp, adminFetch, timestampToMs } from "@/lib/admin-utils";
import { uploadAdminImage } from "@/lib/admin-image-upload";
import { toast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

type PostStatus = "all" | "published" | "draft";

interface Post {
  id: string;
  title: string;
  slug: string;
  category: "news" | "activity_review";
  cover_image_url: string;
  content_markdown: string;
  tags: string[];
  status: "draft" | "published";
  published_at: unknown;
  updated_at: unknown;
  author_uid: string;
  author_display_name?: string;
}

interface PostForm {
  title: string;
  slug: string;
  category: "news" | "activity_review";
  status: "draft" | "published";
  cover_image_url: string;
  content_markdown: string;
  tags: string;
}

const EMPTY_FORM: PostForm = {
  title: "",
  slug: "",
  category: "news",
  status: "draft",
  cover_image_url: "",
  content_markdown: "",
  tags: "",
};

function toSlug(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fff-]/g, "")
    .replace(/\s+/g, "-");
}

function parseTags(tagsText: string): string[] {
  return tagsText
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function PostsPage() {
  const t = useTranslations("adminPosts");
  const [activeTab, setActiveTab] = useState<PostStatus>("all");
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PostForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PostForm, string>>>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [tagSuggestionsOpen, setTagSuggestionsOpen] = useState(false);
  const [tagStats, setTagStats] = useState<{ tag: string; count: number }[]>(
    [],
  );
  const [tagStatsLoading, setTagStatsLoading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverDragActive, setCoverDragActive] = useState(false);
  const tagSuggestRootRef = useRef<HTMLDivElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const coverDragCounterRef = useRef(0);

  // Form embedding state
  const [forms, setForms] = useState<{ id: string; title: string }[]>([]);
  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toggle status loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const tabs: TabItem<PostStatus>[] = useMemo(
    () => [
      { key: "all", label: t("tabs.all") },
      { key: "published", label: t("tabs.published") },
      { key: "draft", label: t("tabs.draft") },
    ],
    [t],
  );

  const categoryMap: Record<string, string> = useMemo(
    () => ({
      news: t("category.news"),
      activity_review: t("category.activityReview"),
    }),
    [t],
  );

  const statusBadge: Record<string, { variant: "success" | "neutral"; label: string }> = useMemo(
    () => ({
      published: { variant: "success", label: t("status.published") },
      draft: { variant: "neutral", label: t("status.draft") },
    }),
    [t],
  );

  const fallbackTagSuggestions = useMemo(
    () => t("fallbackTags").split(",").map((x) => x.trim()).filter(Boolean),
    [t],
  );

  const fetchPosts = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("status", activeTab);
      const data = await adminFetch<{ posts: Post[] }>(`/api/admin/posts?${params}`);
      setPosts(data.posts ?? []);
    } catch (err) {
      if (!background) {
        setError(err instanceof Error ? err.message : t("error.loadFailed"));
      } else {
        toast(err instanceof Error ? err.message : t("error.loadFailed"), "error");
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    setTagStatsLoading(true);

    Promise.all([
      adminFetch<{ tags: { tag: string; count: number }[] }>("/api/admin/tags").catch(() => ({ tags: [] })),
      adminFetch<{ id: string; title: string }[]>("/api/admin/forms").catch(() => [])
    ]).then(([tagData, formData]) => {
      if (!cancelled) {
        setTagStats(tagData.tags ?? []);
        setForms(Array.isArray(formData) ? formData : []);
      }
    }).finally(() => {
      if (!cancelled) setTagStatsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [modalOpen]);


  useEffect(() => {
    if (!tagSuggestionsOpen) return;
    const onDoc = (e: MouseEvent) => {
      const root = tagSuggestRootRef.current;
      if (!root || root.contains(e.target as Node)) return;
      setTagSuggestionsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [tagSuggestionsOpen]);

  const filtered = posts.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
  });

  // --- Form helpers ---

  function updateForm(patch: Partial<PostForm>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      if ("title" in patch && !slugManuallyEdited) {
        next.slug = toSlug(patch.title!);
      }
      return next;
    });
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof PostForm, string>> = {};
    if (!form.title.trim()) errors.title = t("error.titleRequired");
    if (!form.slug.trim()) errors.slug = t("error.slugRequired");
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // --- Create ---

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setSlugManuallyEdited(false);
    setTagSuggestionsOpen(false);
    setModalOpen(true);
  }

  // --- Edit ---

  const openEdit = useCallback(async (post: Post) => {
    setEditingId(post.id);
    setFormErrors({});
    setSlugManuallyEdited(true);
    setTagSuggestionsOpen(false);
    setModalLoading(true);
    setModalOpen(true);

    try {
      const full = await adminFetch<Post>(`/api/admin/posts/${post.id}`);
      setForm({
        title: full.title,
        slug: full.slug,
        category: full.category,
        status: full.status,
        cover_image_url: full.cover_image_url ?? "",
        content_markdown: full.content_markdown ?? "",
        tags: Array.isArray(full.tags) ? full.tags.join(", ") : "",
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error.loadPostFailed"), "error");
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  }, [t]);

  // --- Submit (create or edit) ---

  async function handleSubmit() {
    if (!validate()) return;
    setModalLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        category: form.category,
        status: form.status,
        cover_image_url: form.cover_image_url.trim() || null,
        content_markdown: form.content_markdown,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      };

      if (editingId) {
        await adminFetch(`/api/admin/posts/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await adminFetch("/api/admin/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setModalOpen(false);
      toast(editingId ? t("toast.updated") : t("toast.created"), "success");
      await fetchPosts(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error.saveFailed"), "error");
    } finally {
      setModalLoading(false);
    }
  }

  // --- Delete ---

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminFetch(`/api/admin/posts/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      toast(t("toast.deleted"), "success");
      await fetchPosts(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error.deleteFailed"), "error");
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  // --- Toggle status ---

  const handleToggleStatus = useCallback(
    async (post: Post) => {
      const newStatus = post.status === "published" ? "draft" : "published";
      setTogglingId(post.id);
      try {
        await adminFetch(`/api/admin/posts/${post.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        toast(
          t("toast.statusChanged", {
            status: newStatus === "published" ? t("status.published") : t("status.draft"),
          }),
          "success",
        );
        await fetchPosts(true);
      } catch (err) {
        toast(err instanceof Error ? err.message : t("error.statusUpdateFailed"), "error");
      } finally {
        setTogglingId(null);
      }
    },
    [fetchPosts, t],
  );

  const selectedTags = parseTags(form.tags);

  const tagCountByName = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of tagStats) m.set(row.tag, row.count);
    return m;
  }, [tagStats]);

  const popularTagPool = useMemo(() => {
    if (tagStats.length > 0) return tagStats.map((t) => t.tag);
    return fallbackTagSuggestions;
  }, [tagStats, fallbackTagSuggestions]);

  const availableTagSuggestions = useMemo(
    () =>
      popularTagPool
        .filter((tag) => !selectedTags.includes(tag))
        .slice(0, 24),
    [popularTagPool, selectedTags],
  );

  function addTag(tag: string) {
    const nextTags = [...selectedTags, tag];
    updateForm({ tags: nextTags.join(", ") });
  }

  async function handleCoverUpload(file: File) {
    setCoverUploading(true);
    try {
      const data = await uploadAdminImage(file);
      updateForm({ cover_image_url: data.url });
      toast(t("toast.coverUploaded"), "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error.coverUploadFailed"), "error");
    } finally {
      setCoverUploading(false);
      if (coverFileInputRef.current) {
        coverFileInputRef.current.value = "";
      }
    }
  }

  const handleCoverDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (coverUploading) return;
    coverDragCounterRef.current += 1;
    setCoverDragActive(true);
  };

  const handleCoverDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (coverUploading) return;
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCoverDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (coverUploading) return;
    coverDragCounterRef.current = Math.max(0, coverDragCounterRef.current - 1);
    if (coverDragCounterRef.current === 0) {
      setCoverDragActive(false);
    }
  };

  const handleCoverDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (coverUploading) return;
    coverDragCounterRef.current = 0;
    setCoverDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast(t("error.coverDropImageOnly"), "error");
      return;
    }
    void handleCoverUpload(file);
  };

  const postColumns = useMemo<ColumnDef<Post>[]>(
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
        accessorKey: "category",
        header: ({ column }) => adminSortableHeader(column, t("table.category")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            categoryMap[rowA.original.category] ?? rowA.original.category,
            categoryMap[rowB.original.category] ?? rowB.original.category,
          ),
        cell: ({ row }) => (
          <span className="text-neutral-600">
            {categoryMap[row.original.category] ?? row.original.category}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: ({ column }) => adminSortableHeader(column, t("table.status")),
        sortingFn: (rowA, rowB) =>
          compareZh(rowA.original.status, rowB.original.status),
        cell: ({ row }) => {
          const badge = statusBadge[row.original.status] ?? statusBadge.draft;
          return <Badge variant={badge.variant}>{badge.label}</Badge>;
        },
      },
      {
        id: "author",
        accessorFn: (row) =>
          row.author_display_name ?? row.author_uid ?? "",
        header: ({ column }) => adminSortableHeader(column, t("table.author")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.getValue("author")),
            String(rowB.getValue("author")),
          ),
        cell: ({ row }) => (
          <span className="text-neutral-600">
            {row.original.author_display_name ?? row.original.author_uid ?? t("common.notAvailable")}
          </span>
        ),
      },
      {
        id: "displayDate",
        accessorFn: (row) =>
          timestampToMs(
            row.status === "published" ? row.published_at : row.updated_at,
          ),
        header: ({ column }) => adminSortableHeader(column, t("table.date")),
        sortingFn: "basic",
        cell: ({ row }) => {
          const post = row.original;
          const displayDate =
            post.status === "published"
              ? formatTimestamp(
                post.published_at as Parameters<typeof formatTimestamp>[0],
              )
              : formatTimestamp(
                post.updated_at as Parameters<typeof formatTimestamp>[0],
              );
          return (
            <span className="text-neutral-400">{displayDate}</span>
          );
        },
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          const post = row.original;
          return (
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                disabled={togglingId === post.id}
                onClick={() => handleToggleStatus(post)}
                title={post.status === "published" ? t("actions.toDraft") : t("actions.publish")}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${togglingId === post.id ? "animate-spin" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={() => openEdit(post)}
                title={t("actions.edit")}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(post)}
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
    [categoryMap, handleToggleStatus, openEdit, statusBadge, t, togglingId],
  );

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        count={posts.length}
        action={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            {t("actions.create")}
          </Button>
        }
      />

      {error && <AdminErrorBanner message={error} />}

      <Card className="mt-6">
        <AdminFilterBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("searchPlaceholder")}
        />

        {loading ? (
          <AdminTableSkeleton rows={5} columns={[192, 64, 56, 80, 80]} />
        ) : (
          <AdminDataTable
            data={filtered}
            columns={postColumns}
            getRowId={(row) => row.id}
            emptyMessage={t("empty")}
            emptyColSpan={6}
          />
        )}
      </Card>

      {/* Create / Edit Modal */}
      <FullPageFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        title={editingId ? t("modal.editTitle") : t("modal.createTitle")}
        submitLabel={editingId ? t("modal.update") : t("modal.create")}
        loading={modalLoading}
        isFetching={modalLoading && editingId !== null && Object.keys(formErrors).length === 0 && !form.title}
        wide
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label={t("form.title")}
              required
              value={form.title}
              onChange={(e) => updateForm({ title: (e.target as HTMLInputElement).value })}
              error={formErrors.title}
              placeholder={t("form.titlePlaceholder")}
            />
            <FormField
              label={t("form.slug")}
              required
              value={form.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setForm((prev) => ({ ...prev, slug: (e.target as HTMLInputElement).value }));
              }}
              error={formErrors.slug}
              hint={t("form.slugHint")}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              label={t("form.category")}
              as="select"
              value={form.category}
              onChange={(e) => updateForm({ category: (e.target as HTMLSelectElement).value as PostForm["category"] })}
              options={[
                { value: "news", label: t("category.news") },
                { value: "activity_review", label: t("category.activityReview") },
              ]}
            />
            <FormField
              label={t("form.status")}
              as="select"
              value={form.status}
              onChange={(e) => updateForm({ status: (e.target as HTMLSelectElement).value as PostForm["status"] })}
              options={[
                { value: "draft", label: t("status.draft") },
                { value: "published", label: t("status.published") },
              ]}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                {t("form.tags")}
              </label>
              <div
                ref={tagSuggestRootRef}
                className="rounded-lg border border-border bg-white px-2 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30"
              >
                <div className="flex items-center gap-2">
                  <input
                    value={form.tags}
                    onChange={(e) => updateForm({ tags: (e.target as HTMLInputElement).value })}
                    onFocus={() => setTagSuggestionsOpen(true)}
                    placeholder={t("form.tagsPlaceholder")}
                    className="w-full bg-transparent px-1 text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => setTagSuggestionsOpen((prev) => !prev)}
                    className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200"
                  >
                    {t("form.suggestedTags")}
                  </button>
                </div>
                {tagSuggestionsOpen && (
                  <div className="mt-2 border-t border-border/70 pt-2">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-neutral-400">
                      {tagStatsLoading && (
                        <span className="shrink-0 text-neutral-400">{t("common.loading")}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableTagSuggestions.length === 0 ? (
                        <span className="text-xs text-neutral-400">
                          {tagStatsLoading
                            ? t("form.loadingSuggestedTags")
                            : t("form.allSuggestedAdded")}
                        </span>
                      ) : (
                        availableTagSuggestions.map((tag) => {
                          const c = tagCountByName.get(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => addTag(tag)}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                            >
                              {tag}
                              {c != null && c > 0 && (
                                <span className="font-normal text-primary/70">
                                  ×{c}
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                {t("form.tagsHint")}
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              {t("form.coverImage")}
            </label>
            <div className="space-y-3">
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void handleCoverUpload(file);
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onDragEnter={handleCoverDragEnter}
                onDragOver={handleCoverDragOver}
                onDragLeave={handleCoverDragLeave}
                onDrop={handleCoverDrop}
                onClick={() => {
                  if (!coverUploading) coverFileInputRef.current?.click();
                }}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === " ") && !coverUploading) {
                    e.preventDefault();
                    coverFileInputRef.current?.click();
                  }
                }}
                className={`cursor-pointer rounded-lg border border-dashed px-4 py-3 transition-all ${coverDragActive
                  ? "border-primary bg-primary/5 ring-1 ring-primary/25"
                  : "border-border bg-neutral-50 hover:border-primary/50 hover:bg-primary/5"
                  } ${coverUploading ? "cursor-not-allowed opacity-70" : ""}`}
                aria-label={t("form.coverDropAria")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-700">
                      {t("form.coverDropTitle")}
                    </p>
                    <p className="text-xs text-neutral-400">
                      {t("form.coverHint")}
                    </p>
                  </div>
                  <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-500 shadow-sm ring-1 ring-border">
                    {coverUploading ? t("form.coverUploading") : t("form.coverChoose")}
                  </span>
                </div>
                {form.cover_image_url && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-border bg-white">
                    <Image
                      src={form.cover_image_url}
                      alt={t("form.coverPreviewAlt")}
                      width={960}
                      height={480}
                      unoptimized
                      className="max-h-52 w-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {t("form.coverUploadDirect")}
            </p>
          </div>



          <MarkdownEditor
            value={form.content_markdown}
            onChange={(v) => updateForm({ content_markdown: v })}
            forms={forms}
          />
        </div>
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
