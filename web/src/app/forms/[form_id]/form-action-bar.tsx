"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createLoginHref } from "@/lib/login-redirect";
import { useTranslations } from "next-intl";

export function FormActionBar() {
  const t = useTranslations("formActionBar");
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const loginHref = createLoginHref(pathname);

  if (loading) {
    return (
      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <p className="text-[12px] text-neutral-400">{t("checking")}</p>
        <div className="h-[38px] w-[90px] rounded-full bg-neutral-100 animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
        <p className="text-[12px] text-neutral-400">{t("loginFirst")}</p>
        <Link
          href={loginHref}
          className="inline-flex h-[38px] items-center rounded-full bg-primary px-5 text-[14px] font-[550] text-white transition-colors hover:bg-primary-light"
        >
          {t("loginToSubmit")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
      <p className="text-[12px] text-neutral-400">
        {t("loggedInAs")} <span className="font-medium text-neutral-700">{user.display_name || user.email}</span>
      </p>
      <button
        type="button"
        className="inline-flex h-[38px] items-center rounded-full bg-primary px-5 text-[14px] font-[550] text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("submit")}
      </button>
    </div>
  );
}
