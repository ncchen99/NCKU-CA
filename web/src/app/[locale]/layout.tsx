import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { buildOgImageUrl, getSiteUrl } from "@/lib/seo";
import {
    DEFAULT_LOCALE,
    I18N_ENABLED,
    type AppLocale,
    SUPPORTED_LOCALES,
    normalizeLocale,
} from "@/lib/i18n-config";
import enMessages from "../../../messages/en.json";
import zhTwMessages from "../../../messages/zh-TW.json";

const MESSAGES: Record<AppLocale, Record<string, unknown>> = {
    en: enMessages,
    "zh-TW": zhTwMessages,
};

type Props = Readonly<{
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
    if (!I18N_ENABLED) {
        return [{ locale: DEFAULT_LOCALE }];
    }

    return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, "children">): Promise<Metadata> {
    const { locale: rawLocale } = await params;
    const locale = normalizeLocale(rawLocale);
    const isEn = locale === "en";

    const title = isEn ? "NCKU Club Association" : "成功大學社團聯合會 NCA";
    const titleTemplate = isEn ? "%s | NCKU Club Association" : "%s | 成大社聯會";
    const description = isEn
        ? "Official digital platform for the NCKU Club Association, providing announcements, forms, attendance, and operations management."
        : "國立成功大學社團聯合會官方數位平台。提供公告資訊、表單報名、點名管理一站式服務。";
    const ogSubtitle = isEn ? "Official NCKU CA Platform" : "NCKU CA 官方平台";
    const siteName = isEn ? "NCKU Club Association" : "成功大學社團聯合會";

    return {
        metadataBase: getSiteUrl(),
        title: {
            default: title,
            template: titleTemplate,
        },
        description,
        verification: {
            google: "cd1s498aORyKCK9CyY0iIXUlHAu2eg0GgdHfAi-mNIE",
        },
        alternates: {
            canonical: `/${locale}`,
            languages: {
                en: "/en",
                "zh-TW": "/zh-TW",
            },
        },
        openGraph: {
            type: "website",
            locale: locale === "en" ? "en_US" : "zh_TW",
            siteName,
            images: [
                {
                    url: buildOgImageUrl({
                        title,
                        subtitle: ogSubtitle,
                        path: `/${locale}`,
                    }),
                    width: 1200,
                    height: 630,
                    alt: siteName,
                },
            ],
        },
        twitter: {
            card: "summary_large_image",
            images: [
                buildOgImageUrl({
                    title,
                    subtitle: ogSubtitle,
                    path: `/${locale}`,
                }),
            ],
        },
    };
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale: rawLocale } = await params;
    const locale = normalizeLocale(rawLocale);

    if (!SUPPORTED_LOCALES.includes(locale)) {
        notFound();
    }

    setRequestLocale(locale);

    return (
        <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
            {children}
        </NextIntlClientProvider>
    );
}
