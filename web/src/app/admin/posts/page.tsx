"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
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
  content_markdown: string;
  tags: string;
}

const EMPTY_FORM: PostForm = {
  title: "",
  slug: "",
  category: "news",
  status: "draft",
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

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Post | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Toggle status loading
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== "all") params.set("status", activeTab);
      const data = await adminFetch<{ posts: Post[] }>(`/api/admin/posts?${params}`);
      setPosts(data.posts ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入文章失敗");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
      const full = await adminFetch<Post>(`/api/admin/posts/${post.id}`);
      setForm({
        title: full.title,
        slug: full.slug,
        category: full.category,
        status: full.status,
        content_markdown: full.content_markdown ?? "",
        tags: Array.isArray(full.tags) ? full.tags.join(", ") : "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "載入文章資料失敗");
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
      await fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "儲存文章失敗");
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
      await fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "刪除文章失敗");
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
        await fetchPosts();
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新狀態失敗");
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
        wide
      >
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
            hint="URL 路徑，自動根據標題產生"
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
            <div className="rounded-lg border border-border bg-white px-2 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/30">
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
                    <span>
                      {tagStats.length > 0
                        ? "依全站使用次數排序 · 點擊加入"
                        : "點擊即可加入"}
                    </span>
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
        <MarkdownEditor
          value={form.content_markdown}
          onChange={(v) => updateForm({ content_markdown: v })}
        />
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
