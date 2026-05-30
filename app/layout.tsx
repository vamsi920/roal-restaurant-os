import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Sora } from "next/font/google";
import { buildSiteMetadataDefaults } from "@/lib/seo/public-open-graph";
import { getMetadataBase } from "@/lib/site-url";
import "./typography.css";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
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
    <html lang="en" className={`[color-scheme:light] ${plusJakarta.variable} ${sora.variable}`}>
      <body className="min-h-[100dvh] bg-base font-sans text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
