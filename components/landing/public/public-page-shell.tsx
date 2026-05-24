import type { ReactNode } from "react";
import "@/app/landing.css";
import "@/app/blog-theme.css";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { LandingNav } from "@/components/landing/landing-nav";

/** Marketing routes: nav + lavender canvas + footer. */
export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing-story public-theme landing-story-canvas min-w-0 max-w-[100vw] overflow-x-clip text-ink">
      <a href="#main" className="landing-skip-link">
        Skip to content
      </a>
      <LandingNav />
      <main id="main" className="min-w-0">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
