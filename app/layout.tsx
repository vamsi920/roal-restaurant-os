import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, JetBrains_Mono } from "next/font/google";
import { buildSiteMetadataDefaults } from "@/lib/seo/public-open-graph";
import { getMetadataBase } from "@/lib/site-url";
import "./typography.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "ROAL: AI Phone Answering & Ordering for Restaurants",
  description:
    "ROAL is an AI phone host for restaurants. It answers calls, takes pickup orders from your live menu and sends tickets to your kitchen. $0.90 per completed order, no monthly fee.",
  applicationName: "ROAL",
  authors: [{ name: "Venkata Vamsi", url: "/about#founder" }],
  creator: "ROAL",
  publisher: "ROAL",
  category: "business",
  alternates: {
    types: { "application/rss+xml": [{ url: "/blog/feed.xml", title: "The ROAL Journal" }] },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "tVDUSDR0_2XYoRtuwZLCQmECTJVYyOTl4680Z_TjGK8",
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } } : {}),
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icons/roal-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/roal-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/roal-app-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/roal-apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  ...buildSiteMetadataDefaults(),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`[color-scheme:light] ${inter.variable} ${bricolage.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-[100dvh] bg-base font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
