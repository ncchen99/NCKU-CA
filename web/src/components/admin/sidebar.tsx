"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HomeIcon,
  DocumentTextIcon,
  NewspaperIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  TagIcon,
  UsersIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/auth-context";
import type { ComponentType, SVGProps } from "react";

interface NavItem {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { icon: HomeIcon, href: "/admin", label: "Dashboard" },
  { icon: DocumentTextIcon, href: "/admin/content", label: "網站內容" },
  { icon: NewspaperIcon, href: "/admin/posts", label: "文章管理" },
  { icon: ClipboardDocumentListIcon, href: "/admin/forms", label: "表單管理" },
  { icon: BanknotesIcon, href: "/admin/deposit", label: "保證金管理" },
  { icon: CheckBadgeIcon, href: "/admin/attendance", label: "點名管理" },
  { icon: TagIcon, href: "/admin/clubs", label: "社團名單" },
  { icon: UsersIcon, href: "/admin/users", label: "用戶管理" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, firebaseUser, signOut } = useAuth();

  const displayName =
    user?.display_name || firebaseUser?.displayName || "管理員";
  const displayEmail = user?.email || firebaseUser?.email || "";
  const avatarInitial = displayName.charAt(0) || "管";

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const handleBackToFrontend = () => {
    // Force a full page load to avoid stale App Router cache after admin edits.
    window.location.assign("/");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-neutral-950">
      <div className="flex h-16 items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-white">
            成大社聯會
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
            Admin
          </span>
        </div>
        <button
          type="button"
          onClick={handleBackToFrontend}
          className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
          title="回到前台"
          aria-label="回到前台"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13px] font-medium transition-colors ${active
                ? "border-l-[3px] border-primary bg-white/10 pl-[7px] text-white"
                : "text-neutral-400 hover:bg-white/5 hover:text-white"
                }`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
            {avatarInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-white">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-neutral-500">
              {displayEmail}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
            title="登出"
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
