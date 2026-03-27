const DEFAULT_REDIRECT_PATH = "/";

const LOGIN_PATH_PATTERN = /^\/(?:[a-z]{2}(?:-[a-z]{2})?)?\/?login(?:\?|$)/i;

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
    if (LOGIN_PATH_PATTERN.test(value)) {
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