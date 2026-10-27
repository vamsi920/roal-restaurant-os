import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthViewportAssist } from "@/components/auth/auth-viewport-assist";
import { RoalWordmark } from "@/components/auth/roal-wordmark";
import { AUTH_PAGE_ROBOTS } from "@/lib/seo/robots-metadata";
import "@/app/auth-page.css";

export const metadata: Metadata = {
  robots: AUTH_PAGE_ROBOTS,
};

/** Auth shell: paper canvas, wordmark, one centered card, quiet legal footer. No marketing nav. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-canvas text-ink">
      <a href="#auth-main" className="auth-skip">
        Skip to form
      </a>
      <AuthViewportAssist />
      <main id="auth-main" className="auth-main" tabIndex={-1}>
        <div className="auth-column">
          <RoalWordmark />
          {children}
        </div>
      </main>
      <footer className="auth-legal">
        <Link href="/terms">Terms</Link>
        <span aria-hidden>·</span>
        <Link href="/privacy">Privacy</Link>
      </footer>
    </div>
  );
}
