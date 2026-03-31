import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { AuthProvider } from "@/lib/auth-context";
import { ProfileCompletionGate } from "@/components/layout/profile-completion-gate";
import { Toaster } from "@/components/ui/toaster";
import { buildOgImageUrl, getSiteUrl } from "@/lib/seo";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: "成功大學社團聯合會 NCA",
    template: "%s | 成大社聯會",
  },
  description:
    "國立成功大學社團聯合會官方數位平台。提供公告資訊、表單報名、點名管理一站式服務。",
  verification: {
    google: "cd1s498aORyKCK9CyY0iIXUlHAu2eg0GgdHfAi-mNIE",
  },
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    siteName: "成功大學社團聯合會",
    images: [
      {
        url: buildOgImageUrl({
          title: "成功大學社團聯合會",
          subtitle: "NCKU CA 官方平台",
          path: "/",
        }),
        width: 1200,
        height: 630,
        alt: "成功大學社團聯合會 NCA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [buildOgImageUrl({
      title: "成功大學社團聯合會",
      subtitle: "NCKU CA 官方平台",
      path: "/",
    })],
  },
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
        <AuthProvider>
          <ProfileCompletionGate>{children}</ProfileCompletionGate>
        </AuthProvider>
        <Toaster />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
