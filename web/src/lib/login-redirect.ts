const DEFAULT_REDIRECT_PATH = "/";

export function sanitizeRedirectPath(
    rawRedirect: string | null | undefined,
    fallback = DEFAULT_REDIRECT_PATH,
): string {
    if (!rawRedirect) return fallback;

    const value = rawRedirect.trim();
    if (!value.startsWith("/") || value.startsWith("//")) {
        return fallback;
    }

    // Avoid login-loop redirects.
    if (value === "/login" || value.startsWith("/login?")) {
        return fallback;
    }

    return value;
}

export function createLoginHref(pathname: string, search = ""): string {
    const safePathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
    const normalizedSearch = search
        ? search.startsWith("?")
            ? search
            : `?${search}`
        : "";
    const redirect = `${safePathname}${normalizedSearch}`;
    const query = new URLSearchParams({ redirect });
    return `/login?${query.toString()}`;
}