"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface AdminErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function AdminErrorState({ message, onRetry }: AdminErrorStateProps) {
  const t = useTranslations("adminCommon");

  return (
    <div className="flex h-48 flex-col items-center justify-center gap-3">
      <p className="text-sm text-red-600">{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          {t("retry")}
        </Button>
      )}
    </div>
  );
}

export function AdminErrorBanner({ message }: { message: string }) {
  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
      {message}
    </div>
  );
}
