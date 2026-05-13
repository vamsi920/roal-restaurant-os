import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ROAL — Restaurant Operational Abstraction Layer",
  description:
    "Scan menus with AI vision, sync to a real-time KDS dashboard.",
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
