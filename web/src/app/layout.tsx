import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextIntlClientProvider } from "next-intl";
import { AuthProvider } from "@/lib/auth-context";
import { ProfileCompletionGate } from "@/components/layout/profile-completion-gate";
import {
  DEFAULT_LOCALE,
  type AppLocale,
} from "@/lib/i18n-config";
import enMessages from "../../messages/en.json";
import zhTwMessages from "../../messages/zh-TW.json";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const MESSAGES: Record<AppLocale, Record<string, unknown>> = {
  en: enMessages,
  "zh-TW": zhTwMessages,
};

export const metadata: Metadata = {
  title: {
    default: "NCKU Club Association",
    template: "%s | NCKU Club Association",
  },
  description:
    "Official digital platform for the NCKU Club Association, providing announcements, forms, attendance, and operations management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-TW"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans" suppressHydrationWarning>
        <NextIntlClientProvider
          locale={DEFAULT_LOCALE}
          messages={MESSAGES[DEFAULT_LOCALE]}
        >
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
