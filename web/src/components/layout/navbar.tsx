"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

const NAV_LINKS = [
  { label: "關於我們", href: "/about" },
  { label: "組織章程", href: "/charter" },
  { label: "幹部成員", href: "/members" },
  { label: "最新消息", href: "/news" },
  { label: "活動回顧", href: "/activities" },
];

interface NavbarProps {
  isLoggedIn?: boolean;
  userName?: string;
  hasActiveEvent?: boolean;
  openForms?: { id: string; title: string }[];
}

export function Navbar({
  isLoggedIn = false,
  userName = "",
  hasActiveEvent = false,
  openForms = [],
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [formsOpen, setFormsOpen] = useState(false);
  const formsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (formsRef.current && !formsRef.current.contains(e.target as Node)) {
        setFormsOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const avatarInitial = userName?.charAt(0) || "U";

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
          {NAV_LINKS.map((link) => (
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
          {isLoggedIn ? (
            <>
              <Link
                href="/attendance"
                className={`flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium transition-colors ${hasActiveEvent
                  ? "bg-primary text-white hover:bg-primary-dark"
                  : "text-neutral-600 ring-1 ring-neutral-950/8 hover:bg-neutral-50"
                  }`}
              >
                ✓ 今日點名
              </Link>

              <div ref={formsRef} className="relative">
                <button
                  onClick={() => setFormsOpen((v) => !v)}
                  className="flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium text-neutral-600 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50"
                >
                  📋 表單報名
                  <ChevronDownIcon className="h-3 w-3" />
                </button>

                {formsOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-white p-1 shadow-lg ring-1 ring-neutral-950/8">
                    {openForms.length > 0 ? (
                      openForms.map((form) => (
                        <Link
                          key={form.id}
                          href={`/forms/${form.id}`}
                          className="block rounded-lg px-3 py-2 text-[13px] text-neutral-700 transition-colors hover:bg-neutral-50"
                          onClick={() => setFormsOpen(false)}
                        >
                          {form.title}
                        </Link>
                      ))
                    ) : (
                      <p className="px-3 py-4 text-center text-[13px] text-neutral-400">
                        目前沒有開放表單
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="h-5 w-px bg-neutral-200" aria-hidden />

              <Link
                href="/profile"
                className="flex h-8 w-8 items-center justify-center rounded-full ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50"
              >
                <span className="text-[13px] font-medium text-neutral-700">
                  {avatarInitial}
                </span>
              </Link>
            </>
          ) : (
            <button className="flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium text-neutral-600 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50">
              以 Google 登入
            </button>
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
            {NAV_LINKS.map((link) => (
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
            {isLoggedIn ? (
              <div className="flex flex-col gap-2">
                <Link
                  href="/attendance"
                  className={`flex h-10 items-center justify-center rounded-full text-[13px] font-medium transition-colors ${hasActiveEvent
                    ? "bg-primary text-white"
                    : "text-neutral-600 ring-1 ring-neutral-950/8"
                    }`}
                  onClick={() => setMobileOpen(false)}
                >
                  ✓ 今日點名
                </Link>
                <Link
                  href="/forms"
                  className="flex h-10 items-center justify-center rounded-full text-[13px] font-medium text-neutral-600 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50"
                  onClick={() => setMobileOpen(false)}
                >
                  📋 表單報名
                </Link>
              </div>
            ) : (
              <button className="flex h-10 w-full items-center justify-center rounded-full text-[13px] font-medium text-neutral-600 ring-1 ring-neutral-950/8 transition-colors hover:bg-neutral-50">
                以 Google 登入
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
