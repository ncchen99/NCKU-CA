"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  ArrowRightStartOnRectangleIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/lib/auth-context";
import { createLoginHref } from "@/lib/login-redirect";
import { CHARTER_DOCUMENTS } from "@/lib/charter-documents";

const NAV_LINKS = [
  { label: "關於我們", href: "/about" },
  { label: "幹部成員", href: "/members" },
  { label: "最新消息", href: "/news" },
  { label: "活動回顧", href: "/activities" },
];

export function Navbar() {
  const { user, firebaseUser, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const loginHref = createLoginHref(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [charterOpen, setCharterOpen] = useState(false);
  const [mobileCharterOpen, setMobileCharterOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const charterRef = useRef<HTMLDivElement>(null);

  const isLoggedIn = !loading && !!firebaseUser;
  const isAdmin = user?.role === "admin";
  const userName =
    user?.display_name || firebaseUser?.displayName || "";
  const avatarInitial = userName?.charAt(0) || "U";

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
      if (
        charterRef.current &&
        !charterRef.current.contains(e.target as Node)
      ) {
        setCharterOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 h-14 bg-white ring-1 ring-neutral-950/8">
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="NCA Logo" className="h-7 w-7 shrink-0" />
          <div className="flex items-baseline gap-2">
            <span className="text-[13px] font-[650] tracking-tight text-neutral-950">
              成大社聯會
            </span>
            <span className="font-mono text-[13px] font-[700] uppercase tracking-wider text-neutral-400">
              NCKU NCA
            </span>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 lg:flex">
          <Link
            href={NAV_LINKS[0].href}
            className="rounded-full px-3 py-1.5 text-[13px] font-[450] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
          >
            {NAV_LINKS[0].label}
          </Link>

          <div ref={charterRef} className="relative">
            <button
              type="button"
              onClick={() => setCharterOpen((v) => !v)}
              className="flex items-center gap-0.5 rounded-full px-3 py-1.5 text-[13px] font-[450] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
              aria-expanded={charterOpen}
              aria-haspopup="true"
            >
              組織章程
            </button>
            {charterOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-max min-w-[140px] rounded-xl bg-white py-1 shadow-lg ring-1 ring-neutral-950/8">
                {CHARTER_DOCUMENTS.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/charter/${doc.slug}`}
                    className="block whitespace-nowrap px-4 py-2.5 text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50"
                    onClick={() => setCharterOpen(false)}
                  >
                    {doc.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {NAV_LINKS.slice(1).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-3 py-1.5 text-[13px] font-[450] text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-950"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop right section */}
        <div className="hidden items-center gap-2 lg:flex">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-full bg-neutral-100" />
          ) : isLoggedIn ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex h-8 items-center gap-1.5 rounded-full bg-neutral-900 px-3 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  <Cog6ToothIcon className="h-3.5 w-3.5" />
                  後台管理
                </Link>
              )}

              <div className="h-5 w-px bg-neutral-200" aria-hidden />

              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex h-8 items-center gap-2 rounded-full px-1 pr-2.5 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                    {avatarInitial}
                  </span>
                  <ChevronDownIcon className="h-3 w-3 text-neutral-500" />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-white p-1 shadow-lg ring-1 ring-neutral-950/8">
                    <div className="border-b border-neutral-100 px-3 py-2.5">
                      <p className="truncate text-[13px] font-medium text-neutral-950">
                        {userName}
                      </p>
                      <p className="truncate text-[11px] text-neutral-500">
                        {firebaseUser?.email}
                      </p>
                    </div>
                    <Link
                      href="/profile"
                      className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <UserCircleIcon className="h-4 w-4 text-neutral-400" />
                      個人資料
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-red-600 transition-colors hover:bg-red-50"
                    >
                      <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                      登出
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href={loginHref}
              className="flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-neutral-600 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50"
            >
              以 Google 登入
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full ring-1 ring-neutral-950/8 lg:hidden"
          aria-label={mobileOpen ? "關閉選單" : "開啟選單"}
        >
          {mobileOpen ? (
            <XMarkIcon className="h-5 w-5 text-neutral-700" />
          ) : (
            <Bars3Icon className="h-5 w-5 text-neutral-700" />
          )}
        </button>
      </nav>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="border-t border-border bg-white px-4 pb-4 pt-2 lg:hidden">
          <div className="flex flex-col gap-0.5">
            <Link
              key={NAV_LINKS[0].href}
              href={NAV_LINKS[0].href}
              className="rounded-lg px-3 py-2.5 text-[13px] font-[450] text-neutral-600 transition-colors hover:bg-neutral-50"
              onClick={() => setMobileOpen(false)}
            >
              {NAV_LINKS[0].label}
            </Link>

            <button
              type="button"
              onClick={() => setMobileCharterOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[13px] font-[450] text-neutral-600"
            >
              組織章程
            </button>
            {mobileCharterOpen && (
              <div className="ml-2 flex flex-col border-l border-border pl-3">
                {CHARTER_DOCUMENTS.map((doc) => (
                  <Link
                    key={doc.slug}
                    href={`/charter/${doc.slug}`}
                    className="rounded-lg py-2 text-[13px] text-neutral-600 hover:text-neutral-950"
                    onClick={() => setMobileOpen(false)}
                  >
                    {doc.title}
                  </Link>
                ))}
              </div>
            )}

            {NAV_LINKS.slice(1).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-[13px] font-[450] text-neutral-600 transition-colors hover:bg-neutral-50"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-3 border-t border-border pt-3">
            {loading ? (
              <div className="flex h-10 items-center justify-center">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : isLoggedIn ? (
              <div className="flex flex-col gap-2">
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-neutral-900 text-[13px] font-medium text-white transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Cog6ToothIcon className="h-4 w-4" />
                    後台管理
                  </Link>
                )}
                <Link
                  href="/profile"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium text-neutral-700 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50"
                  onClick={() => setMobileOpen(false)}
                >
                  <UserCircleIcon className="h-4 w-4" />
                  個人資料
                </Link>
                <div className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
                    {avatarInitial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-neutral-950">
                      {userName}
                    </p>
                    <p className="truncate text-[11px] text-neutral-500">
                      {firebaseUser?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-full text-[13px] font-medium text-red-600 ring-1 ring-red-200 transition-colors hover:bg-red-50"
                >
                  <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
                  登出
                </button>
              </div>
            ) : (
              <Link
                href={loginHref}
                className="flex h-10 w-full items-center justify-center rounded-full text-[13px] font-medium text-neutral-600 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50"
                onClick={() => setMobileOpen(false)}
              >
                以 Google 登入
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
