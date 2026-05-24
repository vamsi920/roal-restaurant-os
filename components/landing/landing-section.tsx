import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: "default" | "muted" | "ink";
  labelledBy?: string;
};

export function LandingSection({
  id,
  children,
  className,
  tone = "default",
  labelledBy,
}: Props) {
  return (
    <section
      id={id}
      className={cn(
        "landing-section scroll-mt-28 border-b border-line",
        tone === "muted" && "landing-section--muted",
        tone === "ink" && "landing-cta-band",
        className
      )}
      {...(labelledBy ? { "aria-labelledby": labelledBy } : {})}
    >
      <div className="landing-wrap">{children}</div>
    </section>
  );
}

export function LandingHeader({
  eyebrow,
  title,
  description,
  titleId,
  centered,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  titleId?: string;
  centered?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn("landing-header max-w-2xl min-w-0", centered && "mx-auto text-center", className)}
    >
      {eyebrow ? <p className="landing-eyebrow">{eyebrow}</p> : null}
      <h2 id={titleId} className={cn("landing-h2", eyebrow && "mt-2")}>
        {title}
      </h2>
      {description ? (
        <p className={cn("landing-lead", centered && "mx-auto")}>{description}</p>
      ) : null}
    </div>
  );
}
