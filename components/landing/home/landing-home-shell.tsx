import type { ReactNode } from "react";
import "@/app/landing-home.css";
import { MarketingFooter } from "@/components/landing/marketing-footer";
import { LandingHomeNav } from "./landing-home-nav";
import { LandingVideoBackground } from "./landing-video-bg";

export function LandingHomeShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing-home landing-home-canvas">
      <LandingVideoBackground />
      <LandingHomeNav />
      <main id="main" className="home-main">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
