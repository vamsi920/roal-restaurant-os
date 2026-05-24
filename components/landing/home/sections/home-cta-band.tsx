import { PublicCtaBand } from "@/components/landing/public";
import { HOME_CTA_BAND } from "@/lib/landing/home-cta-band-copy";
import { LandingHomeCta } from "../landing-home-cta";

export function HomeCtaBand() {
  const { title, description, primary, secondary } = HOME_CTA_BAND;

  return (
    <PublicCtaBand variant="home" titleId="cta-heading" title={title} description={description}>
      <LandingHomeCta centered primary={primary} secondary={secondary} />
    </PublicCtaBand>
  );
}
