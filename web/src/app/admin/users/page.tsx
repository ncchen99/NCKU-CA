"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import {
  AdminPageHeader,
  AdminFilterBar,
  AdminTableSkeleton,
  AdminErrorState,
  ConfirmDialog,
  FormModal,
  AdminDataTable,
  adminSortableHeader,
  compareZh,
  type TabItem,
} from "@/components/admin/shared";
import { ClubSearchSelect } from "@/components/shared/club-search-select";
import { formatTimestamp, adminFetch, timestampToMs } from "@/lib/admin-utils";
import { getAdminUsers } from "@/lib/client-firestore";
import { toast } from "@/components/ui/use-toast";

type RoleTab = "all" | "admin" | "club_member";

interface User {
  uid: string;
  display_name: string;
  email: string;
  role: "admin" | "club_member";
  club_id?: string;
  club_name?: string;
  position_title?: string;
  created_at: unknown;
}

const tabs: TabItem<RoleTab>[] = [
  { key: "all", label: "全部" },
  { key: "admin", label: "管理員" },
  { key: "club_member", label: "社團成員" },
];

const roleConfig: Record<
  string,
  { variant: "primary" | "neutral"; label: string }
> = {
  admin: { variant: "primary", label: "管理員" },
  club_member: { variant: "neutral", label: "社團成員" },
};

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<RoleTab>("all");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // role change confirmation
  const [roleTarget, setRoleTarget] = useState<{
    uid: string;
    displayName: string;
    currentRole: string;
    newRole: "admin" | "club_member";
    newRoleLabel: string;
  } | null>(null);
  const [roleLoading, setRoleLoading] = useState(false);

  // club association modal
  const [clubTarget, setClubTarget] = useState<{
    uid: string;
    displayName: string;
    clubId: string;
  } | null>(null);
  const [clubLoading, setClubLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // user detail modal
  const [detailUser, setDetailUser] = useState<User | null>(null);

  const fetchUsers = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
    try {
      const data = await getAdminUsers();
      setUsers(data as unknown as User[]);
    } catch (err) {
      if (!background) {
        setError(err instanceof Error ? err.message : "無法載入用戶資料");
      } else {
        toast(err instanceof Error ? err.message : "無法載入用戶資料", "error");
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- role change ---
  const openRoleConfirm = useCallback((user: User) => {
    const newRole = user.role === "admin" ? "club_member" : "admin";
    const newRoleLabel = newRole === "admin" ? "管理員" : "社團成員";
    setRoleTarget({
      uid: user.uid,
      displayName: user.display_name,
      currentRole: user.role,
      newRole,
      newRoleLabel,
    });
  }, []);

  const handleRoleConfirm = async () => {
    if (!roleTarget) return;
    setRoleLoading(true);
    try {
      await adminFetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: roleTarget.uid, role: roleTarget.newRole }),
      });
      setRoleTarget(null);
      toast("變更角色成功", "success");
      await fetchUsers(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "角色更新失敗，請稍後再試", "error");
    } finally {
      setRoleLoading(false);
    }
  };

  // --- club association ---
  const openClubModal = useCallback((user: User) => {
    setClubTarget({
      uid: user.uid,
      displayName: user.display_name,
      clubId: user.club_id ?? "",
    });
  }, []);

  const handleClubSave = async () => {
    if (!clubTarget) return;
    setClubLoading(true);
    try {
      await adminFetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: clubTarget.uid,
          club_id: clubTarget.clubId || null,
        }),
      });
      setClubTarget(null);
      toast("社團關聯更新成功", "success");
      await fetchUsers(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "社團關聯更新失敗", "error");
    } finally {
      setClubLoading(false);
    }
  };

  const handleExportCsv = useCallback(() => {
    setExportLoading(true);
    try {
      const header = ["姓名", "Email", "角色", "職位", "所屬社團", "建立日期"];
      const rows = users.map((u) => [
        u.display_name ?? "",
        u.email ?? "",
        u.role === "admin" ? "管理員" : "社團成員",
        u.position_title ?? "",
        u.club_name ?? u.club_id ?? "",
        formatTimestamp(
          u.created_at as Parameters<typeof formatTimestamp>[0],
        ) ?? "",
      ]);

      const csvContent = [header, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              const escaped = String(cell).replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(","),
        )
        .join("\n");

      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast("CSV 已下載", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "匯出失敗", "error");
    } finally {
      setExportLoading(false);
    }
  }, [users]);

  const filtered = users.filter((u) => {
    if (activeTab !== "all" && u.role !== activeTab) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = (u.display_name ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const club = (u.club_name ?? u.club_id ?? "").toLowerCase();
      if (!name.includes(q) && !email.includes(q) && !club.includes(q))
        return false;
    }
    return true;
  });

  const userColumns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "display_name",
        header: ({ column }) => adminSortableHeader(column, "姓名"),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.original.display_name ?? ""),
            String(rowB.original.display_name ?? ""),
          ),
        cell: ({ row }) => {
          const user = row.original;
          const name = user.display_name ?? "";
          const displayed = name.length > 9 ? name.slice(0, 9) + "..." : name;
          return (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-semibold text-neutral-600">
                {(user.display_name ?? "?")[0]}
              </div>
              <span
                className="font-medium text-neutral-950"
                title={user.display_name}
              >
                {displayed}
              </span>
            </div>
          );
        },
        meta: { thClassName: "px-5", tdClassName: "px-5" },
      },
      {
        accessorKey: "email",
        header: ({ column }) => adminSortableHeader(column, "Email"),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.original.email ?? ""),
            String(rowB.original.email ?? ""),
          ),
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-neutral-400">
            {row.original.email}
          </span>
        ),
      },
      {
        accessorKey: "role",
        header: ({ column }) => adminSortableHeader(column, "角色"),
        sortingFn: (rowA, rowB) =>
          compareZh(rowA.original.role, rowB.original.role),
        cell: ({ row }) => {
          const badge = roleConfig[row.original.role];
          return <Badge variant={badge.variant}>{badge.label}</Badge>;
        },
      },
      {
        id: "club",
        accessorFn: (row) => row.club_name ?? row.club_id ?? "",
        header: ({ column }) => adminSortableHeader(column, "所屬社團"),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.getValue("club")),
            String(rowB.getValue("club")),
          ),
        cell: ({ row }) => (
          <button
            type="button"
            className="text-[12px] text-neutral-600 underline decoration-dashed underline-offset-2 hover:text-neutral-800"
            onClick={() => openClubModal(row.original)}
            title="點擊設定社團"
          >
            {row.original.club_name ?? row.original.club_id ?? "—"}
          </button>
        ),
      },
      {
        accessorKey: "position_title",
        header: ({ column }) => adminSortableHeader(column, "職位"),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.original.position_title ?? ""),
            String(rowB.original.position_title ?? ""),
          ),
        cell: ({ row }) => (
          <span className="text-[12px] text-neutral-600">
            {row.original.position_title || "—"}
          </span>
        ),
      },
      {
        id: "created_at",
        accessorFn: (row) => timestampToMs(row.created_at),
        header: ({ column }) => adminSortableHeader(column, "建立日期"),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="text-neutral-400">
            {formatTimestamp(
              row.original.created_at as Parameters<typeof formatTimestamp>[0],
            )}
          </span>
        ),
      },
      {
        id: "actions",
        header: "操作",
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openRoleConfirm(row.original)}
            className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            {row.original.role === "club_member"
              ? "設為管理員"
              : "設為社團成員"}
          </button>
        ),
        meta: { thClassName: "px-3", tdClassName: "px-3" },
      },
    ],
    [openClubModal, openRoleConfirm],
  );

  return (
    <>
      <AdminPageHeader
        title="用戶管理"
        count={!loading && !error ? users.length : undefined}
        action={
          <Button
            variant="ghost"
            onClick={handleExportCsv}
            disabled={exportLoading || loading || !!error}
          >
            {exportLoading ? (
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownTrayIcon className="h-4 w-4" />
            )}
            {exportLoading ? "準備下載中…" : "匯出 CSV"}
          </Button>
        }
      />

      <Card className="mt-6">
        <AdminFilterBar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="搜尋用戶..."
        />

        {loading ? (
          <div className="overflow-hidden">
            <AdminTableSkeleton rows={6} columns={[160, 120, 64, 72, 80, 80, 72]} />
          </div>
        ) : error ? (
          <AdminErrorState message={error} onRetry={fetchUsers} />
        ) : (
          <AdminDataTable
            data={filtered}
            columns={userColumns}
            getRowId={(row) => row.uid}
            emptyMessage="沒有找到符合條件的用戶"
            emptyColSpan={7}
            onRowClick={setDetailUser}
          />
        )}
      </Card>

      {/* role change confirm */}
      <ConfirmDialog
        open={!!roleTarget}
        onClose={() => setRoleTarget(null)}
        onConfirm={handleRoleConfirm}
        loading={roleLoading}
        title="變更用戶角色"
        description={
          roleTarget
            ? `確定要將「${roleTarget.displayName}」的角色變更為「${roleTarget.newRoleLabel}」嗎？`
            : undefined
        }
        confirmLabel="確認變更"
      />

      <FormModal
        open={!!clubTarget}
        onClose={() => setClubTarget(null)}
        onSubmit={handleClubSave}
        title={
          clubTarget
            ? `設定「${clubTarget.displayName}」的所屬社團`
            : "設定所屬社團"
        }
        submitLabel="儲存"
        loading={clubLoading}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-700">選擇社團</label>
          <ClubSearchSelect
            value={clubTarget?.clubId ?? ""}
            onChange={(val) =>
              setClubTarget((prev) => (prev ? { ...prev, clubId: val } : null))
            }
            placeholder="搜尋社團名稱..."
            initialClubName={users.find(u => u.uid === clubTarget?.uid)?.club_name}
          />
          <p className="text-xs text-neutral-400">
            選擇此用戶所屬的社團，可搜尋社團名稱
          </p>
        </div>
      </FormModal>

      {/* user detail modal */}
      <Modal
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
        title="用戶資訊"
      >
        {detailUser && (
          <div className="space-y-4">
            {/* avatar + name header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-sm font-semibold text-neutral-600">
                {(detailUser.display_name ?? "?")[0]}
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-neutral-950 break-all">
                  {detailUser.display_name}
                </p>
                <p className="text-xs text-neutral-400">{detailUser.email}</p>
              </div>
            </div>

            {/* info grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-neutral-50 px-3 py-2.5">
                <p className="text-[11px] font-medium text-neutral-400">角色</p>
                <div className="mt-1">
                  <Badge variant={roleConfig[detailUser.role]?.variant ?? "neutral"}>
                    {roleConfig[detailUser.role]?.label ?? detailUser.role}
                  </Badge>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-neutral-50 px-3 py-2.5">
                <p className="text-[11px] font-medium text-neutral-400">職位</p>
                <p className="mt-1 text-sm text-neutral-700">
                  {detailUser.position_title || "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-neutral-50 px-3 py-2.5">
                <p className="text-[11px] font-medium text-neutral-400">所屬社團</p>
                <p className="mt-1 text-sm text-neutral-700">
                  {detailUser.club_name ?? detailUser.club_id ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-neutral-50 px-3 py-2.5">
                <p className="text-[11px] font-medium text-neutral-400">建立日期</p>
                <p className="mt-1 text-sm text-neutral-700">
                  {formatTimestamp(
                    detailUser.created_at as Parameters<typeof formatTimestamp>[0],
                  ) ?? "—"}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
