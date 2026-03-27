import { defineRouting } from "next-intl/routing";
import {
    DEFAULT_LOCALE,
    I18N_COOKIE_NAME,
    I18N_ENABLED,
    SUPPORTED_LOCALES,
} from "@/lib/i18n-config";

export const routing = defineRouting({
    locales: [...SUPPORTED_LOCALES],
    defaultLocale: DEFAULT_LOCALE,
    localePrefix: I18N_ENABLED ? "always" : "never",
    localeDetection: I18N_ENABLED,
    localeCookie: {
        name: I18N_COOKIE_NAME,
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
    },
});
