"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { LanguageIcon } from "@heroicons/react/24/outline";
import { AppSelect } from "@/components/ui/app-select";
import {
    I18N_COOKIE_NAME,
    I18N_ENABLED,
    normalizeLocale,
} from "@/lib/i18n-config";
import { localizePath } from "@/lib/locale-path";

export function LanguageSwitcher() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const t = useTranslations("common");
    const locale = normalizeLocale(useLocale());

    if (!I18N_ENABLED) {
        return null;
    }

    const onChange = (nextLocale: string) => {
        const normalized = normalizeLocale(nextLocale);
        const maxAge = 60 * 60 * 24 * 365;
        document.cookie = `${I18N_COOKIE_NAME}=${normalized}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;

        const localizedPath = localizePath(pathname ?? "/", normalized);
        const query = searchParams.toString();
        const href = query ? `${localizedPath}?${query}` : localizedPath;
        router.push(href);
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
