"use client";

import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LanguageIcon } from "@heroicons/react/24/outline";
import { AppSelect } from "@/components/ui/app-select";
import {
  DEFAULT_LOCALE,
  I18N_COOKIE_NAME,
  I18N_ENABLED,
  normalizeLocale,
} from "@/lib/i18n-config";

export function LanguageSwitcher() {
  const router = useRouter();
  const t = useTranslations("common");
  const locale = normalizeLocale(useLocale());

  if (!I18N_ENABLED) {
    return null;
  }

  const onChange = (nextLocale: string) => {
    const normalized = normalizeLocale(nextLocale);
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${I18N_COOKIE_NAME}=${normalized}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;

    document.documentElement.lang = normalized === DEFAULT_LOCALE ? DEFAULT_LOCALE : normalized;

    router.refresh();
  };

  return (
    <div className="inline-flex items-center text-neutral-600">
      <AppSelect
        value={locale}
        onChange={onChange}
        options={[
          { value: "zh-TW", label: t("languageZh") },
          { value: "en", label: t("languageEn") },
        ]}
        className="w-[126px]"
        triggerStyle="pill-compact"
        triggerTone="light"
        triggerClassName="text-neutral-600"
        optionTone="muted"
        displayLabelClassName="text-neutral-600"
        leadingIcon={<LanguageIcon className="h-4 w-4" />}
        aria-invalid={false}
      />
    </div>
  );
}
