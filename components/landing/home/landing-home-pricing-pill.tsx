import Link from "next/link";
import { cn } from "@/lib/cn";
import { HOME_HERO_PRICING_PILL } from "@/lib/landing/home-theme";

export function LandingHomePricingPill() {
  const { href, label } = HOME_HERO_PRICING_PILL;

  return (
    <Link
      href={href}
      className={cn("home-pricing-pill", "home-pricing-pill--hero")}
      aria-label={`${label}. View pricing.`}
    >
      <span className="home-pricing-pill__label">{label}</span>
    </Link>
  );
}
