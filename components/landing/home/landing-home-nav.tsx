"use client";

import { PublicMarketingNav } from "@/components/landing/public/public-marketing-nav";
import { HOME_NAV } from "@/lib/landing/home-theme";

export function LandingHomeNav() {
  return <PublicMarketingNav links={HOME_NAV} shellClassName="home-nav" />;
}
