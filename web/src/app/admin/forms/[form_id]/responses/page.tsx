"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/shared";

export default function FormResponsesPage() {
  const params = useParams();
  const formId = params.form_id as string;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="表單回覆" subtitle={`表單 ID：${formId}`} />
      <p className="text-sm text-neutral-600">
        此頁面尚未完成建置。請至{" "}
        <Link href="/admin/forms" className="text-primary underline">
          表單管理
        </Link>{" "}
        操作。
      </p>
    </div>
  );
}
