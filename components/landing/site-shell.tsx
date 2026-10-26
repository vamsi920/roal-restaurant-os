import type { ReactNode } from "react";
import "@/app/landing.css";
import "@/app/blog-theme.css";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteNav } from "@/components/landing/site-nav";
import { RevealObserver } from "@/components/landing/reveal";

/**
 * Public page shell: floating nav + paper canvas + giant-wordmark footer.
 * `.landing-story.public-theme` stays on the wrapper because the blog theme is scoped to it.
 */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing-story public-theme min-w-0 overflow-x-clip text-ink">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <SiteNav />
      <RevealObserver />
      <main id="main" className="site-main min-w-0">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
