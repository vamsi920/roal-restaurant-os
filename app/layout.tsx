import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { buildSiteMetadataDefaults } from "@/lib/seo/public-open-graph";
import { getMetadataBase } from "@/lib/site-url";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "ROAL — Pickup calls to your kitchen screen",
  description:
    "ROAL answers pickup calls from your live menu, sends kitchen tickets, and charges only for successful orders—not per-minute phone fees.",
  icons: {
    icon: [{ url: "/icons/roal-app-icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/roal-app-icon.svg", type: "image/svg+xml" }],
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
    <html lang="en" className={`[color-scheme:light] ${dmSans.variable} ${fraunces.variable}`}>
      <body className="min-h-[100dvh] bg-base font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
