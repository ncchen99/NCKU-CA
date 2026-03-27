import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { AdminSidebar } from "@/components/admin/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { normalizeLocale } from "@/lib/i18n-config";

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale(await getLocale());
  const isEn = locale === "en";

  return {
    title: {
      default: isEn ? "Admin" : "後台管理",
      template: isEn
        ? "%s | Admin - NCKU Club Association"
        : "%s | 後台管理 - 成大社聯會",
    },
  };
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AdminSidebar />
      <main className="ml-60 flex-1 relative">
        <div className="mx-auto max-w-[1200px] px-8 py-8">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
