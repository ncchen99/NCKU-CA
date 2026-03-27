import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

function getHostnameFromUrl(urlString?: string): string | null {
  if (!urlString) return null;
  try {
    return new URL(urlString).hostname;
  } catch {
    return null;
  }
}

const r2PublicHostname =
  getHostnameFromUrl(process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL) ??
  getHostnameFromUrl(process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL);

const isDev = process.env.NODE_ENV !== "production";
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://apis.google.com https://www.gstatic.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://accounts.google.com https://apis.google.com https://*.firebaseapp.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: cspDirectives },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      ...(r2PublicHostname
        ? [
          {
            protocol: "https" as const,
            hostname: r2PublicHostname,
          },
        ]
        : []),
    ],
  },
};

export default withNextIntl(nextConfig);
