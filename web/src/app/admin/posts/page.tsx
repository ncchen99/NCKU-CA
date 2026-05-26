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
import {
  getAdminPosts,
  getAdminPostById,
  getAdminPostTags,
  getAdminForms,
} from "@/lib/client-firestore";
import { uploadAdminImage } from "@/lib/admin-image-upload";
import { toast } from "@/components/ui/use-toast";

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

const tabs: TabItem<PostStatus>[] = [
  { key: "all", label: "全部" },
  { key: "published", label: "已發布" },
  { key: "draft", label: "草稿" },
];

const categoryMap: Record<string, string> = {
  news: "最新消息",
  activity_review: "活動回顧",
};

const statusBadge: Record<string, { variant: "success" | "neutral"; label: string }> = {
  published: { variant: "success", label: "已發布" },
  draft: { variant: "neutral", label: "草稿" },
};

/** API 失敗或尚無任何標籤時的後備清單 */
const fallbackTagSuggestions = [
  "公告",
  "系學會",
  "活動",
  "講座",
  "工作坊",
  "競賽",
  "招生",
  "報名中",
  "截止提醒",
];

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

  const fetchPosts = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
    try {
      const data = await getAdminPosts(
        activeTab !== "all" ? { status: activeTab } : undefined,
      );
      setPosts(data as unknown as Post[]);
    } catch (err) {
      if (!background) {
        setError(err instanceof Error ? err.message : "載入文章失敗");
      } else {
        toast(err instanceof Error ? err.message : "載入文章失敗", "error");
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
      getAdminPostTags().catch(() => []),
      getAdminForms().catch(() => []),
    ]).then(([tagData, formData]) => {
      if (!cancelled) {
        setTagStats(tagData);
        setForms(formData.map((f) => ({ id: f.id, title: f.title })));
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
    if (!form.title.trim()) errors.title = "標題為必填";
    if (!form.slug.trim()) errors.slug = "Slug 為必填";
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
      const full = (await getAdminPostById(post.id)) as unknown as Post;
      if (!full) throw new Error("文章不存在或已被刪除");
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
      toast(err instanceof Error ? err.message : "載入文章資料失敗", "error");
      setModalOpen(false);
    } finally {
      setModalLoading(false);
    }
  }, []);

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
      toast(editingId ? "文章已更新" : "文章已建立", "success");
      await fetchPosts(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "儲存文章失敗", "error");
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
      toast("文章已刪除", "success");
      await fetchPosts(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "刪除文章失敗", "error");
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
        toast(`已將狀態更改為 ${newStatus === "published" ? "已發布" : "草稿"}`, "success");
        await fetchPosts(true);
      } catch (err) {
        toast(err instanceof Error ? err.message : "更新狀態失敗", "error");
      } finally {
        setTogglingId(null);
      }
    },
    [fetchPosts],
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
  }, [tagStats]);

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
      toast("封面圖片已上傳", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "封面圖片上傳失敗", "error");
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
      toast("請拖拉圖片檔案", "error");
      return;
    }
    void handleCoverUpload(file);
  };

  const postColumns = useMemo<ColumnDef<Post>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => adminSortableHeader(column, "標題"),
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
        header: ({ column }) => adminSortableHeader(column, "分類"),
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
        header: ({ column }) => adminSortableHeader(column, "狀態"),
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
        header: ({ column }) => adminSortableHeader(column, "作者"),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.getValue("author")),
            String(rowB.getValue("author")),
          ),
        cell: ({ row }) => (
          <span className="text-neutral-600">
            {row.original.author_display_name ?? row.original.author_uid ?? "—"}
          </span>
        ),
      },
      {
        id: "displayDate",
        accessorFn: (row) =>
          timestampToMs(
            row.status === "published" ? row.published_at : row.updated_at,
          ),
        header: ({ column }) => adminSortableHeader(column, "日期"),
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
                title={post.status === "published" ? "轉為草稿" : "發布"}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={`h-4 w-4 ${togglingId === post.id ? "animate-spin" : ""}`}
                />
              </button>
              <button
                type="button"
                onClick={() => openEdit(post)}
                title="編輯"
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <PencilSquareIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(post)}
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
    [handleToggleStatus, openEdit, togglingId],
  );

  return (
    <>
      <AdminPageHeader
        title="文章管理"
        count={posts.length}
        action={
          <Button onClick={openCreate}>
            <PlusIcon className="h-4 w-4" />
            新增文章
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
          searchPlaceholder="搜尋文章..."
        />

        {loading ? (
          <AdminTableSkeleton rows={5} columns={[192, 64, 56, 80, 80]} />
        ) : (
          <AdminDataTable
            data={filtered}
            columns={postColumns}
            getRowId={(row) => row.id}
            emptyMessage="沒有找到符合條件的文章"
            emptyColSpan={6}
          />
        )}
      </Card>

      {/* Create / Edit Modal */}
      <FullPageFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        title={editingId ? "編輯文章" : "新增文章"}
        submitLabel={editingId ? "更新" : "建立"}
        loading={modalLoading}
        isFetching={modalLoading && editingId !== null && Object.keys(formErrors).length === 0 && !form.title}
        wide
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              label="標題"
              required
              value={form.title}
              onChange={(e) => updateForm({ title: (e.target as HTMLInputElement).value })}
              error={formErrors.title}
              placeholder="輸入文章標題"
            />
            <FormField
              label="Slug"
              required
              value={form.slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setForm((prev) => ({ ...prev, slug: (e.target as HTMLInputElement).value }));
              }}
              error={formErrors.slug}
              hint="網址的文字，建議用英文、數字和連字號"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FormField
              label="分類"
              as="select"
              value={form.category}
              onChange={(e) => updateForm({ category: (e.target as HTMLSelectElement).value as PostForm["category"] })}
              options={[
                { value: "news", label: "最新消息" },
                { value: "activity_review", label: "活動回顧" },
              ]}
            />
            <FormField
              label="狀態"
              as="select"
              value={form.status}
              onChange={(e) => updateForm({ status: (e.target as HTMLSelectElement).value as PostForm["status"] })}
              options={[
                { value: "draft", label: "草稿" },
                { value: "published", label: "已發布" },
              ]}
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700">
                標籤
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
                    placeholder="以逗號分隔，可自行輸入"
                    className="w-full bg-transparent px-1 text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
                  />
                  <button
                    type="button"
                    onClick={() => setTagSuggestionsOpen((prev) => !prev)}
                    className="shrink-0 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-200"
                  >
                    推薦標籤
                  </button>
                </div>
                {tagSuggestionsOpen && (
                  <div className="mt-2 border-t border-border/70 pt-2">
                    <div className="mb-1 flex items-center justify-between gap-2 text-xs text-neutral-400">
                      {tagStatsLoading && (
                        <span className="shrink-0 text-neutral-400">載入中…</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {availableTagSuggestions.length === 0 ? (
                        <span className="text-xs text-neutral-400">
                          {tagStatsLoading
                            ? "正在載入熱門標籤…"
                            : "已加入所有推薦標籤"}
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
                多個標籤請用逗號分隔，也可點上方推薦快速加入
              </p>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              封面圖片
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
                aria-label="拖拉上傳封面圖片"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-neutral-700">
                      拖拉圖片到此處，或點擊選擇檔案
                    </p>
                    <p className="text-xs text-neutral-400">
                      上傳後會自動壓縮並轉為 WebP
                    </p>
                  </div>
                  <span className="rounded-md bg-white px-2.5 py-1 text-xs font-medium text-neutral-500 shadow-sm ring-1 ring-border">
                    {coverUploading ? "上傳中..." : "選擇圖片"}
                  </span>
                </div>
                {form.cover_image_url && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-border bg-white">
                    <Image
                      src={form.cover_image_url}
                      alt="封面預覽"
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
              請直接上傳圖片作為封面。
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
        title={`刪除「${deleteTarget?.title ?? ""}」`}
        description="此操作無法復原，確定要刪除這篇文章嗎？"
        confirmLabel="刪除"
        variant="danger"
        loading={deleteLoading}
      />
    </>
  );
}
