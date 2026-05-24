import { PublicCtaActions } from "@/components/landing/public";
import { LANDING_CTA, LANDING_HERO_CTA } from "@/lib/landing/chapters";

type Props = {
  className?: string;
  centered?: boolean;
  /** @deprecated Ink sections use `.landing-cta-band` CSS; prop ignored. */
  inverted?: boolean;
  variant?: "hero" | "default";
};

export function LandingCta({ className, centered, variant = "default" }: Props) {
  const ctas = variant === "hero" ? LANDING_HERO_CTA : LANDING_CTA;

  return (
    <PublicCtaActions
      className={className}
      centered={centered}
      actions={[
        { ...ctas.primary, variant: "primary" },
        { ...ctas.secondary, variant: "ghost" },
      ]}
    />
  );
}
