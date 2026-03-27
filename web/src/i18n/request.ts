import { getRequestConfig } from "next-intl/server";
import {
    DEFAULT_LOCALE,
    I18N_ENABLED,
    normalizeLocale,
} from "@/lib/i18n-config";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
    const requestedLocale = await requestLocale;

    const locale = I18N_ENABLED
        ? normalizeLocale(requestedLocale)
        : DEFAULT_LOCALE;

    if (!routing.locales.includes(locale)) {
        return {
            locale: DEFAULT_LOCALE,
            messages:
                DEFAULT_LOCALE === "en"
                    ? (await import("../../messages/en.json")).default
                    : (await import("../../messages/zh-TW.json")).default,
        };
    }

    const messages =
        locale === "en"
            ? (await import("../../messages/en.json")).default
            : (await import("../../messages/zh-TW.json")).default;

    return {
        locale,
        messages,
    };
});
