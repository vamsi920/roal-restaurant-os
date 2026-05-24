import type { ReactNode } from "react";
import "@/app/landing-home.css";
import { LandingHomeFooter } from "./landing-home-footer";
import { LandingHomeNav } from "./landing-home-nav";
import { LandingVideoBackground } from "./landing-video-bg";

export function LandingHomeShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing-home landing-home-canvas">
      <a href="#main" className="home-skip-link">
        Skip to content
      </a>
      <LandingVideoBackground />
      <LandingHomeNav />
      <main id="main" className="home-main">
        {children}
      </main>
      <LandingHomeFooter />
    </div>
  );
}
