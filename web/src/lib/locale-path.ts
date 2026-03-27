import {
    DEFAULT_LOCALE,
    type AppLocale,
    SUPPORTED_LOCALES,
    normalizeLocale,
} from "@/lib/i18n-config";

const ESCAPED_LOCALES = SUPPORTED_LOCALES.map((locale) =>
    locale.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
);

const LOCALE_PREFIX_PATTERN = new RegExp(
    `^/(?:${ESCAPED_LOCALES.join("|")})(?=/|$)`,
    "i",
);

export function stripLocalePrefix(pathname: string): string {
    const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const stripped = normalized.replace(LOCALE_PREFIX_PATTERN, "") || "/";
    return stripped.startsWith("/") ? stripped : `/${stripped}`;
}

export function extractLocaleFromPathname(pathname: string): AppLocale | null {
    const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const matched = normalized.match(LOCALE_PREFIX_PATTERN)?.[0];
    if (!matched) return null;

    const localeValue = matched.replace(/^\//, "");
    const locale = normalizeLocale(localeValue);
    return SUPPORTED_LOCALES.includes(locale) ? locale : null;
}

export function localizePath(pathname: string, localeInput?: string | null): string {
    const locale = normalizeLocale(localeInput) ?? DEFAULT_LOCALE;
    const basePath = stripLocalePrefix(pathname);

    if (basePath === "/") {
        return `/${locale}`;
    }

    return `/${locale}${basePath}`;
}

export function localizePaths(pathname: string): string[] {
    const basePath = stripLocalePrefix(pathname);
    return SUPPORTED_LOCALES.map((locale) =>
        basePath === "/" ? `/${locale}` : `/${locale}${basePath}`,
    );
}
