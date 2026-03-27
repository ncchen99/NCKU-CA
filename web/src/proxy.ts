import { NextResponse, type NextRequest } from "next/server";
import {
    DEFAULT_LOCALE,
    I18N_COOKIE_NAME,
    I18N_ENABLED,
    normalizeLocale,
} from "@/lib/i18n-config";
import { extractLocaleFromPathname, localizePath } from "@/lib/locale-path";

const SESSION_COOKIE = "__session";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getOrigin(value: string | null): string | null {
    if (!value) return null;
    try {
        return new URL(value).origin;
    } catch {
        return null;
    }
}

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    const session = request.cookies.get(SESSION_COOKIE)?.value;

    const localePrefixedApiPath = pathname.match(/^\/(en|zh-TW)\/(api\/.*)$/i);
    if (localePrefixedApiPath) {
        const normalizedApiPath = `/${localePrefixedApiPath[2]}`;
        const redirectUrl = new URL(`${normalizedApiPath}${request.nextUrl.search}`, request.url);
        return NextResponse.redirect(redirectUrl);
    }

    if (pathname.startsWith("/api") && MUTATING_METHODS.has(request.method)) {
        // Revalidate endpoint is secret-protected and may be called by external systems.
        if (!pathname.startsWith("/api/revalidate")) {
            const expectedOrigin = request.nextUrl.origin;
            const origin = getOrigin(request.headers.get("origin"));
            const refererOrigin = getOrigin(request.headers.get("referer"));
            const isSameOrigin = origin === expectedOrigin || refererOrigin === expectedOrigin;

            if (!isSameOrigin) {
                return NextResponse.json({ error: "CSRF 驗證失敗" }, { status: 403 });
            }
        }
    }

    if (pathname.startsWith("/api/admin")) {
        if (!session) {
            return NextResponse.json({ error: "未授權" }, { status: 401 });
        }
        return NextResponse.next();
    }

    if (pathname.startsWith("/admin")) {
        if (!session) {
            const loginUrl = new URL("/login", request.url);
            const redirect = `${pathname}${request.nextUrl.search}`;
            loginUrl.searchParams.set("redirect", redirect);
            return NextResponse.redirect(loginUrl);
        }
        return NextResponse.next();
    }

    if (!I18N_ENABLED) {
        return NextResponse.next();
    }

    if (extractLocaleFromPathname(pathname)) {
        return NextResponse.next();
    }

    const cookieLocale = request.cookies.get(I18N_COOKIE_NAME)?.value;
    const targetLocale = normalizeLocale(cookieLocale) ?? DEFAULT_LOCALE;
    const localizedPath = localizePath(pathname, targetLocale);
    const redirectUrl = new URL(`${localizedPath}${request.nextUrl.search}`, request.url);

    return NextResponse.redirect(redirectUrl);
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/api/:path*",
        "/",
        "/((?!_next|api|admin|en|zh-TW|.*\\..*).*)",
        "/(en|zh-TW)/api/:path*",
    ],
};
