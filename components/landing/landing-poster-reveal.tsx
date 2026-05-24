import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Server-safe poster motion (CSS scroll-driven; no framer-motion). */

export function LandingPosterReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className} data-poster-reveal>
      {children}
    </div>
  );
}

export function LandingPosterHeroMotion({ children }: { children: ReactNode }) {
  return <div data-poster-hero>{children}</div>;
}

export function LandingPosterHeroPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(className)} data-poster-reveal>
      {children}
    </div>
  );
}

type BeatItem = {
  id: string;
  tone: string;
  title: string;
  body: string;
  art: ReactNode;
  step?: number;
};

export function LandingBeatStaggerGrid({
  items,
  ordered,
}: {
  items: BeatItem[];
  ordered?: boolean;
}) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <ListTag className="landing-beat-grid" data-poster-stagger>
      {items.map((item) => (
        <li
          key={item.id}
          className={`landing-beat-card landing-beat-card--${item.tone}`}
          data-poster-reveal
        >
          {item.step != null ? (
            <span className="landing-beat-card__step" aria-hidden>
              {item.step}
            </span>
          ) : null}
          <div className="landing-beat-card__art" aria-hidden>
            {item.art}
          </div>
          <h3 className="landing-beat-card__title">{item.title}</h3>
          <p className="landing-beat-card__body">{item.body}</p>
        </li>
      ))}
    </ListTag>
  );
}
