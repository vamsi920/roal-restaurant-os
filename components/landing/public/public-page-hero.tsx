import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type PublicPageHeroProps = {
  eyebrow?: string;
  title: string;
  description: string;
  rate?: { amount: string; label: string };
  children?: ReactNode;
  centered?: boolean;
  titleId?: string;
};

export function PublicPageHero({
  eyebrow,
  title,
  description,
  rate,
  children,
  centered,
  titleId = "page-hero-heading",
}: PublicPageHeroProps) {
  const rateAria =
    rate && `${rate.amount} ${rate.label}`.replace(/\s+/g, " ").trim();

  return (
    <section className="public-marketing-hero" aria-labelledby={titleId}>
      <div className="public-marketing-hero__wash" aria-hidden />
      <div
        className={cn(
          "landing-wrap landing-wrap-tight relative z-[1] min-w-0",
          centered && "text-center"
        )}
      >
        <div className={cn("public-reveal relative min-w-0 max-w-3xl", centered && "mx-auto")}>
          {eyebrow ? <p className="landing-eyebrow">{eyebrow}</p> : null}
          <h1 id={titleId} className={cn("landing-display", eyebrow && "mt-3")}>
            {title}
          </h1>
          {rate ? (
            <p className={cn("pricing-hero-rate", centered && "mx-auto")} aria-label={rateAria}>
              <span className="pricing-hero-rate__amount">{rate.amount}</span>
              <span className="pricing-hero-rate__label">{rate.label}</span>
            </p>
          ) : null}
          <p className={cn("landing-lead", rate && "mt-4", centered && "mx-auto")}>
            {description}
          </p>
          {children ? (
            <div className={cn("mt-8", centered && "flex justify-center")}>{children}</div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
