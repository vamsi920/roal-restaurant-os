import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROAL — Restaurant Operational Abstraction Layer",
  description:
    "Scan menus with AI vision, sync to a real-time KDS dashboard.",
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
    <html lang="en" className="[color-scheme:light]">
      <body className="min-h-screen bg-base text-ink antialiased">
        <div className="min-h-screen bg-radial-fade">{children}</div>
      </body>
    </html>
  );
}
