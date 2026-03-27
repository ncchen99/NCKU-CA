"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/loading";

interface AdminTableSkeletonProps {
  rows?: number;
  columns?: number[];
}

export function AdminTableSkeleton({
  rows = 5,
  columns = [192, 64, 56, 80],
}: AdminTableSkeletonProps) {
  void columns;

  return (
    <div className="w-full">
      <div className="border-b border-border bg-neutral-100/50">
        <div className="px-5 h-10 flex items-center">
          <div className="h-3 w-full rounded bg-neutral-300/70" />
        </div>
      </div>
      <div className="divide-y divide-border/30">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-5 h-12 flex items-center">
            <Skeleton className="h-4 w-full rounded bg-neutral-300/90" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSpinnerLoading({ message }: { message?: string }) {
  const t = useTranslations("adminCommon");
  const resolvedMessage = message ?? t("loading");

  return (
    <div className="flex h-48 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <span className="ml-3 text-sm text-neutral-500">{resolvedMessage}</span>
    </div>
  );
}
