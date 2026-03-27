"use client";

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  TagIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/loading";
import { AdminPageHeader } from "@/components/admin/shared";
import { AdminErrorBanner } from "@/components/admin/shared";
import {
  AdminDataTable,
  adminSortableHeader,
  compareZh,
} from "@/components/admin/shared";
import {
  adminFetch,
  timestampToMs,
  type FirestoreTimestamp,
} from "@/lib/admin-utils";
import type { ComponentType, SVGProps } from "react";

interface DepositRecord {
  club_id?: string;
  club_name?: string;
  form_title?: string;
  amount?: number;
}

interface DashboardData {
  clubsCount: number;
  openFormsCount: number;
  pendingDeposits: {
    count: number;
    total: number;
    records: DepositRecord[];
  };
  latestResponses: Array<{
    form_id?: string;
    form_title?: string;
    club_id?: string;
    club_name?: string;
    submitted_at?: FirestoreTimestamp | string;
  }>;
  openAttendanceEvents: Array<{
    stats?: { total: number; checkedIn: number };
  }>;
}

interface StatCardDef {
  label: string;
  value: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href: string;
}

export default function AdminDashboard() {
  const t = useTranslations("adminDashboard");
  const locale = useLocale();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatRelativeTime = (ts: FirestoreTimestamp | string | undefined): string => {
    if (!ts) return t("common.notAvailable");
    let date: Date;
    if (typeof ts === "string") {
      date = new Date(ts);
    } else if (ts._seconds) {
      date = new Date(ts._seconds * 1000);
    } else {
      return t("common.notAvailable");
    }
    if (isNaN(date.getTime())) return t("common.notAvailable");

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t("relative.justNow");
    if (diffMin < 60) return t("relative.minutesAgo", { count: diffMin });
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return t("relative.hoursAgo", { count: diffHr });
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return t("relative.daysAgo", { count: diffDay });
    return date.toLocaleDateString(locale === "en" ? "en-US" : "zh-TW");
  };

  useEffect(() => {
    adminFetch<DashboardData>("/api/admin/stats")
      .then((json) => setData(json))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const attendanceEvent = data?.openAttendanceEvents?.[0];
  const attendanceRate =
    attendanceEvent?.stats && attendanceEvent.stats.total > 0
      ? Math.round(
        (attendanceEvent.stats.checkedIn / attendanceEvent.stats.total) * 100
      )
      : 0;

  const stats: StatCardDef[] = [
    {
      label: t("stats.registeredClubs"),
      value: `${data?.clubsCount ?? 0} ${t("stats.unitCount")}`,
      icon: TagIcon,
      href: "/admin/clubs",
    },
    {
      label: t("stats.openForms"),
      value: `${data?.openFormsCount ?? 0} ${t("stats.unitCount")}`,
      icon: ClipboardDocumentListIcon,
      href: "/admin/forms",
    },
    {
      label: t("stats.pendingDeposits"),
      value: `${data?.pendingDeposits?.count ?? 0} ${t("stats.unitRecords")}`,
      icon: BanknotesIcon,
      href: "/admin/deposit",
    },
    {
      label: t("stats.todayAttendanceRate"),
      value: `${attendanceRate}%`,
      icon: CheckBadgeIcon,
      href: "/admin/attendance",
    },
  ];

  const recentResponses = data?.latestResponses ?? [];
  const depositRecords = data?.pendingDeposits?.records ?? [];

  type DashboardLatestResponse = NonNullable<
    DashboardData["latestResponses"]
  >[number];

  const dashboardResponseColumns = useMemo<ColumnDef<DashboardLatestResponse>[]>(
    () => [
      {
        id: "club",
        accessorFn: (r) => r.club_name ?? r.club_id ?? "",
        header: ({ column }) => adminSortableHeader(column, t("table.club")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.getValue("club")),
            String(rowB.getValue("club")),
          ),
        cell: ({ row }) => (
          <span className="font-medium text-neutral-950">
            {row.original.club_name ?? row.original.club_id ?? t("common.notAvailable")}
          </span>
        ),
        meta: { thClassName: "px-5", tdClassName: "px-5" },
      },
      {
        accessorKey: "form_title",
        header: ({ column }) => adminSortableHeader(column, t("table.form")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.original.form_title ?? ""),
            String(rowB.original.form_title ?? ""),
          ),
        cell: ({ row }) => (
          <span className="text-neutral-600">
            {row.original.form_title ?? t("common.notAvailable")}
          </span>
        ),
        meta: { thClassName: "px-5", tdClassName: "px-5" },
      },
      {
        id: "submitted_at",
        accessorFn: (r) => timestampToMs(r.submitted_at),
        header: ({ column }) =>
          adminSortableHeader(column, t("table.time"), "right"),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="text-neutral-400">
            {formatRelativeTime(row.original.submitted_at)}
          </span>
        ),
        meta: { thClassName: "px-5 text-right", tdClassName: "px-5 text-right" },
      },
      {
        id: "link",
        header: "",
        enableSorting: false,
        cell: ({ row }) => {
          if (!row.original.form_id) return null;
          return (
            <Link
              href={`/admin/forms/${row.original.form_id}`}
              className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
            >
              {t("table.view")}
            </Link>
          );
        },
        meta: { thClassName: "px-5 text-right", tdClassName: "px-5 text-right" },
      },
    ],
    [t],
  );

  const dashboardDepositColumns = useMemo<ColumnDef<DepositRecord>[]>(
    () => [
      {
        id: "club",
        accessorFn: (r) => r.club_name ?? r.club_id ?? "",
        header: ({ column }) => adminSortableHeader(column, t("table.club")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.getValue("club")),
            String(rowB.getValue("club")),
          ),
        cell: ({ row }) => (
          <span className="font-medium text-neutral-950">
            {row.original.club_name ?? row.original.club_id ?? t("common.notAvailable")}
          </span>
        ),
        meta: { thClassName: "px-5", tdClassName: "px-5" },
      },
      {
        accessorKey: "form_title",
        header: ({ column }) => adminSortableHeader(column, t("table.form")),
        sortingFn: (rowA, rowB) =>
          compareZh(
            String(rowA.original.form_title ?? ""),
            String(rowB.original.form_title ?? ""),
          ),
        cell: ({ row }) => (
          <span className="text-neutral-600">
            {row.original.form_title ?? t("common.notAvailable")}
          </span>
        ),
        meta: { thClassName: "px-5", tdClassName: "px-5" },
      },
      {
        id: "amount",
        accessorFn: (r) => r.amount ?? 0,
        header: ({ column }) =>
          adminSortableHeader(column, t("table.amount"), "right"),
        sortingFn: "basic",
        cell: ({ row }) => (
          <span className="font-mono text-sm font-semibold text-red-600">
            ${(row.original.amount ?? 0).toLocaleString()}
          </span>
        ),
        meta: { thClassName: "px-5 text-right", tdClassName: "px-5 text-right" },
      },
      {
        id: "link",
        header: "",
        enableSorting: false,
        cell: () => (
          <Link
            href="/admin/deposit"
            className="inline-flex items-center justify-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary hover:text-white"
          >
            {t("table.goProcess")}
          </Link>
        ),
        meta: { thClassName: "px-5 text-right", tdClassName: "px-5 text-right" },
      },
    ],
    [t],
  );

  const dashboardTableClassNames = {
    theadTr: "border-b border-border text-neutral-500",
    th: "pb-2 font-medium",
    td: "h-12",
    bodyRow:
      "group border-b border-border/50 last:border-0 hover:bg-primary/5",
  } as const;

  if (error) {
    return (
      <>
        <AdminPageHeader
          title={t("title")}
          subtitle={t("subtitle")}
        />
        <AdminErrorBanner message={t("error.loadFailed", { error })} />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card hoverable className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-medium text-neutral-500">
                    {s.label}
                  </p>
                  {loading ? (
                    <Skeleton className="mt-2 h-8 w-20" />
                  ) : (
                    <p className="mt-1.5 text-[32px] font-bold leading-none tracking-tight text-neutral-950">
                      {s.value}
                    </p>
                  )}
                </div>
                <div className="rounded-lg bg-neutral-100 p-2">
                  <s.icon className="h-5 w-5 text-neutral-500" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <h2 className="text-sm font-semibold text-neutral-950">
              {t("sections.recentResponses")}
            </h2>
            <Link
              href="/admin/forms"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {t("viewAll")} <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          <div className="pb-5">
            {loading ? (
              <div className="space-y-3 px-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentResponses.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">
                {t("empty.responses")}
              </p>
            ) : (
              <AdminDataTable
                data={recentResponses}
                columns={dashboardResponseColumns}
                getRowId={(_, i) => `resp-${i}`}
                emptyMessage={t("empty.responses")}
                emptyColSpan={4}
                classNames={{
                  table: "w-full text-left text-[13px]",
                  ...dashboardTableClassNames,
                }}
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-5 pt-5 pb-4">
            <h2 className="text-sm font-semibold text-neutral-950">
              {t("sections.pendingDeposits")}
            </h2>
            <Link
              href="/admin/deposit"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {t("viewAll")} <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
          <div className="pb-5">
            {loading ? (
              <div className="space-y-3 px-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : depositRecords.length === 0 ? (
              <p className="py-8 text-center text-sm text-neutral-400">
                {t("empty.deposits")}
              </p>
            ) : (
              <AdminDataTable
                data={depositRecords}
                columns={dashboardDepositColumns}
                getRowId={(_, i) => `dep-${i}`}
                emptyMessage={t("empty.deposits")}
                emptyColSpan={4}
                classNames={{
                  table: "w-full text-left text-[13px]",
                  ...dashboardTableClassNames,
                }}
              />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
