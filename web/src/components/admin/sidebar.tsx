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
import { useTranslations } from "next-intl";

interface NavItem {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href: string;
  labelKey: string;
}

const navItems: NavItem[] = [
  { icon: HomeIcon, href: "/admin", labelKey: "nav.dashboard" },
  { icon: DocumentTextIcon, href: "/admin/content", labelKey: "nav.content" },
  { icon: NewspaperIcon, href: "/admin/posts", labelKey: "nav.posts" },
  { icon: ClipboardDocumentListIcon, href: "/admin/forms", labelKey: "nav.forms" },
  { icon: BanknotesIcon, href: "/admin/deposit", labelKey: "nav.deposit" },
  { icon: CheckBadgeIcon, href: "/admin/attendance", labelKey: "nav.attendance" },
  { icon: TagIcon, href: "/admin/clubs", labelKey: "nav.clubs" },
  { icon: UsersIcon, href: "/admin/users", labelKey: "nav.users" },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export function AdminSidebar() {
  const t = useTranslations("adminSidebar");
  const pathname = usePathname();
  const router = useRouter();
  const { user, firebaseUser, signOut } = useAuth();

  const displayName =
    user?.display_name || firebaseUser?.displayName || t("defaultAdmin");
  const displayEmail = user?.email || firebaseUser?.email || "";
  const avatarInitial = displayName.charAt(0) || t("defaultAdminInitial");

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-neutral-950">
      <div className="flex h-16 items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tracking-tight text-white">
            {t("brand")}
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70">
            Admin
          </span>
        </div>
        <Link
          href="/"
          className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-white/10 hover:text-white"
          title={t("backToSite")}
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </Link>
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
              {t(item.labelKey)}
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
            title={t("logout")}
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
