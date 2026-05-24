import Link from "next/link";
import { cn } from "@/lib/cn";
import { HOME_PRICING_PILL } from "@/lib/landing/home-theme";

export function LandingHomePricingPill() {
  const { href, line, price } = HOME_PRICING_PILL;

  return (
    <Link
      href={href}
      className={cn("home-pricing-pill", "home-pricing-pill--hero")}
      aria-label={`${line} · ${price}. View pricing.`}
    >
      <span className="home-pricing-pill__line">{line}</span>
      <span className="home-pricing-pill__sep" aria-hidden>
        ·
      </span>
      <span className="home-pricing-pill__price">{price}</span>
    </Link>
  );
}
