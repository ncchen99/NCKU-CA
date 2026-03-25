"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type Column,
} from "@tanstack/react-table";
import { AdminEmptyState } from "./admin-empty-state";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    thClassName?: string;
    tdClassName?: string;
  }
}

export function compareZh(a: string, b: string): number {
  return a.localeCompare(b, "zh-TW");
}

export function AdminTableSortGlyph<TData>({
  column,
}: {
  column: Column<TData, unknown>;
}) {
  const s = column.getIsSorted();
  const active = !!s;
  const dir = s === "desc" ? "desc" : "asc";
  return (
    <svg
      className={`h-3 w-3 shrink-0 transition-colors ${active ? "text-primary" : "text-neutral-300"}`}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden
    >
      {active && dir === "desc" ? (
        <path d="M6 9L2 4h8L6 9z" />
      ) : (
        <path d="M6 3l4 5H2L6 3z" />
      )}
    </svg>
  );
}

export function adminSortableHeader<TData>(
  column: Column<TData, unknown>,
  label: string,
  align: "left" | "right" = "left",
) {
  return (
    <button
      type="button"
      className={
        align === "right"
          ? "inline-flex w-full cursor-pointer select-none items-center justify-end gap-1 text-right font-medium hover:text-neutral-700"
          : "inline-flex cursor-pointer select-none items-center gap-1 text-left font-medium hover:text-neutral-700"
      }
      onClick={column.getToggleSortingHandler()}
    >
      {label}
      <AdminTableSortGlyph column={column} />
    </button>
  );
}

export type AdminDataTableClassNames = {
  table?: string;
  theadTr?: string;
  th?: string;
  td?: string;
  tbody?: string;
  bodyRow?: string;
};

const defaultClassNames: Required<Omit<AdminDataTableClassNames, "tbody">> & {
  tbody?: string;
} = {
  table: "w-full text-left text-[13px]",
  theadTr: "bg-neutral-100 text-neutral-500",
  th: "h-10 font-medium",
  td: "h-12",
  tbody: "",
  bodyRow: "border-b border-border/50 last:border-0 hover:bg-primary/5",
};

export function AdminDataTable<TData>({
  data,
  columns,
  getRowId,
  emptyMessage = "暫無資料",
  emptyColSpan,
  classNames,
}: {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  getRowId?: (originalRow: TData, index: number) => string;
  emptyMessage?: string;
  emptyColSpan: number;
  classNames?: AdminDataTableClassNames;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  // TanStack Table returns function instances by design; React Compiler cannot safely memoize this API.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
    sortDescFirst: false,
  });

  const rows = table.getRowModel().rows;
  const tc = { ...defaultClassNames, ...classNames };

  return (
    <table className={tc.table}>
      <thead>
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id} className={tc.theadTr}>
            {hg.headers.map((header) => (
              <th
                key={header.id}
                className={`${tc.th} ${header.column.columnDef.meta?.thClassName ?? "px-3"}`}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
              </th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody className={tc.tbody || undefined}>
        {rows.length === 0 ? (
          <AdminEmptyState message={emptyMessage} colSpan={emptyColSpan} />
        ) : (
          rows.map((row) => (
            <tr key={row.id} className={tc.bodyRow}>
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={`${tc.td} ${cell.column.columnDef.meta?.tdClassName ?? "px-3"}`}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
