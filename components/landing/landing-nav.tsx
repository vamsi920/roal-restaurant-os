"use client";

import { PublicMarketingNav } from "@/components/landing/public/public-marketing-nav";
import { LANDING_NAV } from "@/lib/landing/chapters";

export function LandingNav() {
  return <PublicMarketingNav links={LANDING_NAV.links} shellClassName="marketing-nav" />;
}
