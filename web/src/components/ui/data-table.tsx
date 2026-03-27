"use client";

import { useState, useCallback, type ReactNode } from "react";
import { useTranslations } from "next-intl";

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (value: unknown, row: T, index: number) => ReactNode;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T | ((row: T, index: number) => string);
  selectable?: boolean;
  onSelectionChange?: (selectedKeys: Set<string>) => void;
  emptyMessage?: string;
  className?: string;
}

function getRowKey<T extends Record<string, unknown>>(
  row: T,
  index: number,
  rowKeyProp: DataTableProps<T>["rowKey"],
): string {
  if (typeof rowKeyProp === "function") return rowKeyProp(row, index);
  return String(row[rowKeyProp]);
}

function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  selectable = false,
  onSelectionChange,
  emptyMessage,
  className = "",
}: DataTableProps<T>) {
  const t = useTranslations("dataTable");
  const finalEmptyMessage = emptyMessage ?? t("empty");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allKeys = data.map((row, i) => getRowKey(row, i, rowKey));

  const toggleAll = useCallback(() => {
    const next =
      selected.size === data.length ? new Set<string>() : new Set(allKeys);
    setSelected(next);
    onSelectionChange?.(next);
  }, [selected.size, data.length, allKeys, onSelectionChange]);

  const toggleRow = useCallback(
    (key: string) => {
      const next = new Set(selected);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      setSelected(next);
      onSelectionChange?.(next);
    },
    [selected, onSelectionChange],
  );

  return (
    <div
      className={`overflow-x-auto rounded-lg shadow-[0_0_0_1px_rgba(10,10,10,0.08)] ${className}`}
    >
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="bg-neutral-100 text-neutral-600">
            {selectable && (
              <th className="w-10 px-3 h-12">
                <input
                  type="checkbox"
                  checked={data.length > 0 && selected.size === data.length}
                  onChange={toggleAll}
                  className="rounded border-neutral-400 accent-primary"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 h-12 font-[550] text-xs uppercase tracking-wide"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selectable ? 1 : 0)}
                className="px-4 h-12 text-center text-neutral-400"
              >
                {finalEmptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => {
              const key = getRowKey(row, i, rowKey);
              const isSelected = selected.has(key);
              return (
                <tr
                  key={key}
                  className={`h-12 transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-primary/5"}`}
                >
                  {selectable && (
                    <td className="px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(key)}
                        className="rounded border-neutral-400 accent-primary"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4">
                      {col.render
                        ? col.render(row[col.key], row, i)
                        : (String(row[col.key] ?? "") as ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export { DataTable };
export type { DataTableProps, Column };
