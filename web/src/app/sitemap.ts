import type { MetadataRoute } from "next";
import { CHARTER_DOCUMENTS } from "@/lib/charter-documents";
import { getOpenForms } from "@/lib/firestore/forms";
import { getPublishedPosts } from "@/lib/firestore/posts";
import { anyTimestampToDate } from "@/lib/datetime";
import { toAbsoluteUrl } from "@/lib/seo";
import {
    DEFAULT_LOCALE,
    I18N_ENABLED,
    SUPPORTED_LOCALES,
    type AppLocale,
} from "@/lib/i18n-config";

const STATIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }> = [
    { path: "/", priority: 1, changeFrequency: "daily" },
    { path: "/about", priority: 0.7, changeFrequency: "monthly" },
    { path: "/members", priority: 0.7, changeFrequency: "monthly" },
    { path: "/news", priority: 0.8, changeFrequency: "daily" },
    { path: "/activities", priority: 0.8, changeFrequency: "weekly" },
    { path: "/attendance", priority: 0.5, changeFrequency: "weekly" },
    { path: "/login", priority: 0.3, changeFrequency: "yearly" },
];

const SITEMAP_LOCALES: AppLocale[] = I18N_ENABLED
    ? [...SUPPORTED_LOCALES]
    : [DEFAULT_LOCALE];

function toLocalizedPath(path: string, locale: AppLocale): string {
    if (!I18N_ENABLED) {
        return path;
    }

    if (path === "/") {
        return `/${locale}`;
    }

    return `/${locale}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const now = new Date();

    const entries: MetadataRoute.Sitemap = [];

    for (const route of STATIC_ROUTES) {
        for (const locale of SITEMAP_LOCALES) {
            entries.push({
                url: toAbsoluteUrl(toLocalizedPath(route.path, locale)),
                lastModified: now,
                changeFrequency: route.changeFrequency,
                priority: route.priority,
            });
        }
    }

    for (const doc of CHARTER_DOCUMENTS) {
        for (const locale of SITEMAP_LOCALES) {
            entries.push({
                url: toAbsoluteUrl(toLocalizedPath(`/charter/${doc.slug}`, locale)),
                lastModified: now,
                changeFrequency: "monthly",
                priority: 0.6,
            });
        }
    }

    try {
        const [{ posts }, forms] = await Promise.all([
            getPublishedPosts(),
            getOpenForms(),
        ]);

        for (const post of posts) {
            const basePath =
                post.category === "activity_review"
                    ? "/activities"
                    : post.category === "news"
                        ? "/news"
                        : null;

            if (!basePath || !post.slug) continue;

            for (const locale of SITEMAP_LOCALES) {
                entries.push({
                    url: toAbsoluteUrl(toLocalizedPath(`${basePath}/${post.slug}`, locale)),
                    lastModified: anyTimestampToDate(post.updated_at) ?? anyTimestampToDate(post.published_at) ?? now,
                    changeFrequency: "weekly",
                    priority: 0.7,
                });
            }
        }

        for (const form of forms) {
            if (!form.id) continue;
            for (const locale of SITEMAP_LOCALES) {
                entries.push({
                    url: toAbsoluteUrl(toLocalizedPath(`/forms/${form.id}`, locale)),
                    lastModified: anyTimestampToDate(form.created_at) ?? now,
                    changeFrequency: "daily",
                    priority: 0.6,
                });
            }
        }
    } catch {
        // Firestore 在建置或環境變數缺漏時可能不可用，保留靜態路由即可。
    }

    return entries;
}
