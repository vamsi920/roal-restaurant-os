import type { ReactNode } from "react";
import { LandingSection } from "@/components/landing/landing-section";
import { cn } from "@/lib/cn";

export type PublicCtaBandProps = {
  id?: string;
  titleId: string;
  eyebrow?: string;
  title: string;
  description?: string;
  /** Glass card on marketing pages, ink band, or homepage glass panel. */
  variant?: "glass" | "ink" | "home";
  sectionClassName?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function PublicCtaBand({
  id,
  titleId,
  eyebrow,
  title,
  description,
  variant = "glass",
  sectionClassName,
  children,
  footer,
}: PublicCtaBandProps) {
  const ink = variant === "ink";
  const home = variant === "home";

  if (home) {
    return (
      <section className={cn("home-section home-cta-band", sectionClassName)} aria-labelledby={titleId}>
        <div className="home-wrap">
          <div className="home-glass-panel public-reveal min-w-0 max-w-full">
            <h2 id={titleId} className="home-h2 mx-auto max-w-[20rem] sm:max-w-none">
              {title}
            </h2>
            {description ? (
              <p className="home-lead home-cta-band__lead mx-auto mt-3 max-w-md text-pretty">
                {description}
              </p>
            ) : null}
            <div className={description ? "mt-5" : "mt-6"}>{children}</div>
            {footer}
          </div>
        </div>
      </section>
    );
  }

  return (
    <LandingSection
      id={id}
      labelledBy={titleId}
      tone={ink ? "ink" : undefined}
      className={cn(
        "public-cta-band scroll-mt-28 border-b-0",
        ink && "landing-cta-band",
        sectionClassName
      )}
    >
      {ink ? (
        <div className="public-cta-band__ink mx-auto max-w-2xl min-w-0 text-center">
          {eyebrow ? <p className="landing-eyebrow">{eyebrow}</p> : null}
          <h2 id={titleId} className="landing-h2 mt-3 text-balance">
            {title}
          </h2>
          {description ? (
            <p className="landing-lead mx-auto mt-4 max-w-xl text-pretty">{description}</p>
          ) : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="public-cta-band__footer">{footer}</div> : null}
        </div>
      ) : (
        <div className="public-cta-band__panel public-reveal glass-card mx-auto max-w-2xl min-w-0 text-center">
          {eyebrow ? <p className="landing-eyebrow">{eyebrow}</p> : null}
          <h2 id={titleId} className="landing-h2 mt-3 text-balance">
            {title}
          </h2>
          {description ? (
            <p className="landing-lead mx-auto mt-4 max-w-xl text-pretty">{description}</p>
          ) : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="public-cta-band__footer">{footer}</div> : null}
        </div>
      )}
    </LandingSection>
  );
}
