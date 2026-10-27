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
  title: "ROAL — The AI phone host for restaurants",
  description:
    "Paste your restaurant link, talk to your AI phone host in 60 seconds, then forward your number. ROAL takes pickup orders from your live menu and charges only for completed orders.",
  icons: {
    icon: [{ url: "/icons/roal-app-icon.svg", type: "image/svg+xml" }],
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
