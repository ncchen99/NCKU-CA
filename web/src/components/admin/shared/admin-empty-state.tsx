"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

interface AdminEmptyStateProps {
  icon?: ReactNode;
  message?: string;
  colSpan?: number;
}

export function AdminEmptyState({
  message,
  colSpan,
}: AdminEmptyStateProps) {
  const t = useTranslations("adminCommon");
  const resolvedMessage = message ?? t("noData");

  if (colSpan) {
    return (
      <tr>
        <td colSpan={colSpan} className="h-32 text-center text-sm text-neutral-400">
          {resolvedMessage}
        </td>
      </tr>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-neutral-400">{resolvedMessage}</p>
    </div>
  );
}
