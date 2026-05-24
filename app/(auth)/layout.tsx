import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PublicAuthHeader } from "@/components/auth/public-auth-header";
import { AUTH_PAGE_ROBOTS } from "@/lib/seo/robots-metadata";
import "@/app/auth-page.css";
import "@/app/public-theme.css";

export const metadata: Metadata = {
  robots: AUTH_PAGE_ROBOTS,
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="public-theme public-theme-canvas flex min-h-[100dvh] flex-col">
      <a href="#auth-main" className="public-auth-skip-link">
        Skip to form
      </a>
      <PublicAuthHeader />
      <main id="auth-main" className="public-auth-main" tabIndex={-1}>
        <div className="public-auth-main__inner">{children}</div>
      </main>
    </div>
  );
}
