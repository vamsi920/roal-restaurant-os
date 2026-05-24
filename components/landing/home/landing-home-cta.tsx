import { PublicCtaActions } from "@/components/landing/public";
import { HOME_CTA } from "@/lib/landing/home-theme";
import { cn } from "@/lib/cn";
import type { PublicCtaLink } from "@/lib/landing/public-cta";

type Props = {
  className?: string;
  alignEnd?: boolean;
  centered?: boolean;
  showSecondary?: boolean;
  primary?: PublicCtaLink;
  secondary?: PublicCtaLink;
};

export function LandingHomeCta({
  className,
  alignEnd,
  centered,
  showSecondary = true,
  primary = HOME_CTA.primary,
  secondary = HOME_CTA.secondary,
}: Props) {
  return (
    <PublicCtaActions
      className={cn(
        "home-cta-row",
        alignEnd && "home-cta-row--end",
        centered && "home-cta-row--center",
        className
      )}
      centered={centered}
      actions={[
        { ...primary, variant: "primary" },
        ...(showSecondary ? [{ ...secondary, variant: "ghost" as const }] : []),
      ]}
    />
  );
}
