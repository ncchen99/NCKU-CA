import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { AuthProvider } from "@/lib/auth-context";
import { ProfileCompletionGate } from "@/components/layout/profile-completion-gate";
import { buildOgImageUrl, getSiteUrl } from "@/lib/seo";
import { normalizeLocale } from "@/lib/i18n-config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = normalizeLocale(await getLocale());
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
      canonical: "./",
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
            path: "/",
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
          path: "/",
        }),
      ],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = normalizeLocale(await getLocale());
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AuthProvider>
            <ProfileCompletionGate>{children}</ProfileCompletionGate>
          </AuthProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
