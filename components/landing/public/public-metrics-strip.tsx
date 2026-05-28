import { cn } from "@/lib/cn";

export type PublicMetricItem = {
  id: string;
  title: string;
  body: string;
};

type Props = {
  eyebrow?: string;
  /** Visible title; use sr-only label via `titleVisuallyHidden` for a11y-only headings. */
  title?: string;
  titleVisuallyHidden?: boolean;
  note?: string;
  items: readonly PublicMetricItem[];
  /** Homepage uses `home-*` classes; marketing pages use `public-metrics-*`. */
  shell?: "home" | "marketing";
  className?: string;
};

export function PublicMetricsStrip({
  eyebrow,
  title = "Product capabilities",
  titleVisuallyHidden = false,
  note,
  items,
  shell = "marketing",
  className,
}: Props) {
  const home = shell === "home";

  return (
    <section
      id={home ? "proof" : undefined}
      className={cn(
        home ? "home-section home-section--tight home-metrics scroll-mt-24" : "public-metrics",
        className
      )}
      aria-labelledby="public-metrics-heading"
    >
      <div className={home ? "home-wrap" : "landing-wrap landing-wrap-tight"}>
        <div className="public-reveal">
          {eyebrow ? (
            <p className={home ? "home-eyebrow" : "landing-eyebrow"}>{eyebrow}</p>
          ) : null}
          <h2
            id="public-metrics-heading"
            className={titleVisuallyHidden ? "sr-only" : home ? "home-h2 mt-2" : "landing-h2 mt-2"}
          >
            {title}
          </h2>
        </div>
        <ul
          className={cn(
            home ? "home-metrics__strip" : "public-metrics__grid",
            "public-reveal-stagger min-w-0 max-w-full"
          )}
        >
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "public-reveal-item",
                home ? "home-metrics__item" : "public-metrics__item glass-card"
              )}
            >
              <p className={home ? "home-metrics__title" : "public-metrics__title"}>
                {item.title}
              </p>
              <p className={home ? "home-metrics__body" : "public-metrics__body"}>{item.body}</p>
            </li>
          ))}
        </ul>
        {note ? (
          <p className={home ? "home-metrics__note" : "public-metrics__note"}>{note}</p>
        ) : null}
      </div>
    </section>
  );
}
