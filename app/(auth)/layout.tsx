import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthViewportAssist } from "@/components/auth/auth-viewport-assist";
import { SiteNav } from "@/components/landing/site-nav";
import { AUTH_PAGE_ROBOTS } from "@/lib/seo/robots-metadata";
import "@/app/landing.css";
import "@/app/auth-page.css";

export const metadata: Metadata = {
  robots: AUTH_PAGE_ROBOTS,
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="landing-story auth-canvas min-w-0 overflow-x-clip text-ink">
      <a href="#auth-main" className="skip-link">
        Skip to form
      </a>
      <SiteNav />
      <AuthViewportAssist />
      <main id="auth-main" className="auth-main" tabIndex={-1}>
        <div className="hero__glow" aria-hidden />
        <div className="auth-main__inner relative">{children}</div>
      </main>
    </div>
  );
}
