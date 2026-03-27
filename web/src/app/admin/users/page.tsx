"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { toast } from "@/components/ui/use-toast";

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

export default function UsersPage() {
  const t = useTranslations("adminUsers");
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

  const fetchUsers = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    if (!background) setError(null);
    try {
      const data = await adminFetch<{ users: User[] }>("/api/admin/users");
      setUsers(data.users || []);
    } catch (err) {
      if (!background) {
        setError(err instanceof Error ? err.message : t("error.loadUsers"));
      } else {
        toast(err instanceof Error ? err.message : t("error.loadUsers"), "error");
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- role change ---
  const openRoleConfirm = useCallback((user: User) => {
    const newRole = user.role === "admin" ? "club_member" : "admin";
    const newRoleLabel =
      newRole === "admin" ? t("role.admin") : t("role.clubMember");
    setRoleTarget({
      uid: user.uid,
      displayName: user.display_name,
      currentRole: user.role,
      newRole,
      newRoleLabel,
    });
  }, [t]);

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
      toast(t("toast.roleChanged"), "success");
      await fetchUsers(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error.updateRole"), "error");
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
      toast(t("toast.clubUpdated"), "success");
      await fetchUsers(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : t("error.updateClub"), "error");
    } finally {
      setClubLoading(false);
    }
  };

  const tabs: TabItem<RoleTab>[] = useMemo(
    () => [
      { key: "all", label: t("tabs.all") },
      { key: "admin", label: t("tabs.admin") },
      { key: "club_member", label: t("tabs.clubMember") },
    ],
    [t],
  );

  const roleConfig: Record<string, { variant: "primary" | "neutral"; label: string }> = useMemo(
    () => ({
      admin: { variant: "primary", label: t("role.admin") },
      club_member: { variant: "neutral", label: t("role.clubMember") },
    }),
    [t],
  );

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
        header: ({ column }) => adminSortableHeader(column, t("table.name")),
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
        header: ({ column }) => adminSortableHeader(column, t("table.email")),
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
        header: ({ column }) => adminSortableHeader(column, t("table.role")),
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
        header: ({ column }) => adminSortableHeader(column, t("table.club")),
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
            title={t("club.editTitle")}
          >
            {row.original.club_name ?? row.original.club_id ?? t("common.notAvailable")}
          </button>
        ),
      },
      {
        id: "created_at",
        accessorFn: (row) => timestampToMs(row.created_at),
        header: ({ column }) => adminSortableHeader(column, t("table.createdAt")),
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
        header: t("table.actions"),
        enableSorting: false,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => openRoleConfirm(row.original)}
            className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
          >
            {row.original.role === "club_member"
              ? t("actions.setAdmin")
              : t("actions.setClubMember")}
          </button>
        ),
        meta: { thClassName: "px-3", tdClassName: "px-3" },
      },
    ],
    [openClubModal, openRoleConfirm, roleConfig, t],
  );

  return (
    <>
      <AdminPageHeader title={t("title")} count={!loading && !error ? users.length : undefined} />

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
            emptyMessage={t("empty")}
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
        title={t("dialogs.roleChangeTitle")}
        description={
          roleTarget
            ? t("dialogs.roleChangeDescription", {
              displayName: roleTarget.displayName,
              newRoleLabel: roleTarget.newRoleLabel,
            })
            : undefined
        }
        confirmLabel={t("dialogs.confirmChange")}
      />

      <FormModal
        open={!!clubTarget}
        onClose={() => setClubTarget(null)}
        onSubmit={handleClubSave}
        title={
          clubTarget
            ? t("dialogs.clubTitleWithName", { displayName: clubTarget.displayName })
            : t("dialogs.clubTitle")
        }
        submitLabel={t("club.save")}
        loading={clubLoading}
      >
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-700">{t("club.label")}</label>
          <ClubSearchSelect
            value={clubTarget?.clubId ?? ""}
            onChange={(val) =>
              setClubTarget((prev) => (prev ? { ...prev, clubId: val } : null))
            }
            placeholder={t("club.placeholder")}
            initialClubName={users.find(u => u.uid === clubTarget?.uid)?.club_name}
          />
          <p className="text-xs text-neutral-400">
            {t("club.hint")}
          </p>
        </div>
      </FormModal>
    </>
  );
}
