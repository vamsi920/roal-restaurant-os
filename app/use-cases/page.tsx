import { LandingHub } from "@/components/seo/landing-template";
import { getLandingPages, LANDING_FAMILIES } from "@/lib/seo/landing";
import { buildPublicPageMetadata } from "@/lib/seo/public-open-graph";

const FAMILY = "use-cases" as const;

export const metadata = buildPublicPageMetadata({
  title: `${LANDING_FAMILIES[FAMILY].hubTitle} | ROAL`,
  description: LANDING_FAMILIES[FAMILY].hubLead,
  canonicalPath: "/use-cases",
});

export default function Page() {
  return <LandingHub family={FAMILY} pages={getLandingPages(FAMILY)} />;
}
