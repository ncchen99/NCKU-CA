"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  AdminPageHeader,
  AdminFilterBar,
  AdminTableSkeleton,
  AdminErrorState,
  ConfirmDialog,
  FormModal,
  FormField,
  AdminDataTable,
  adminSortableHeader,
  compareZh,
  type TabItem,
} from "@/components/admin/shared";
import { formatTimestamp, adminFetch, timestampToMs } from "@/lib/admin-utils";

type RoleTab = "all" | "admin" | "club_member";

interface User {
  uid: string;
  display_name: string;
  email: string;
  role: "admin" | "club_member";
  club_id?: string;
  club_name?: string;
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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ users: User[] }>("/api/admin/users");
      setUsers(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "無法載入用戶資料");
    } finally {
      setLoading(false);
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
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "角色更新失敗，請稍後再試");
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
      await fetchUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "社團關聯更新失敗");
    } finally {
      setClubLoading(false);
    }
  };

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
          return (
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-semibold text-neutral-600">
                {(user.display_name ?? "?")[0]}
              </div>
              <span className="font-medium text-neutral-950">
                {user.display_name}
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
      <AdminPageHeader title="用戶管理" count={!loading && !error ? users.length : undefined} />

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
            <AdminTableSkeleton rows={6} columns={[160, 120, 64, 80, 80, 72]} />
          </div>
        ) : error ? (
          <AdminErrorState message={error} onRetry={fetchUsers} />
        ) : (
          <AdminDataTable
            data={filtered}
            columns={userColumns}
            getRowId={(row) => row.uid}
            emptyMessage="沒有找到符合條件的用戶"
            emptyColSpan={6}
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

      {/* club association modal */}
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
        <FormField
          label="社團 ID"
          value={clubTarget?.clubId ?? ""}
          onChange={(e) =>
            setClubTarget((prev) =>
              prev ? { ...prev, clubId: e.target.value } : null,
            )
          }
          placeholder="輸入社團 ID，留空則清除關聯"
          hint="輸入此用戶所屬的社團代碼"
        />
      </FormModal>
    </>
  );
}
