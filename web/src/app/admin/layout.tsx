import { AdminSidebar } from "@/components/admin/sidebar";
import { verifyAdmin } from "@/lib/admin-auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: {
    default: "Admin",
    template: "%s | Admin – 成大社聯會",
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await verifyAdmin();
  if (!admin) redirect("/");

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AdminSidebar />
      <main className="ml-60 flex-1 relative">
        <div className="mx-auto max-w-[1200px] px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
