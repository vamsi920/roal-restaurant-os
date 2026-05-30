import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "default" | "live" | "ticket" | "kitchen" | "stuck" | "done";

const VARIANT_CLASS: Record<Variant, string> = {
  default: "kds-queue-section--default",
  live: "kds-queue-section--live",
  ticket: "kds-queue-section--ticket",
  kitchen: "kds-queue-section--kitchen",
  stuck: "kds-queue-section--stuck",
  done: "kds-queue-section--done",
};

export function KdsQueueSection({
  id,
  title,
  description,
  variant = "default",
  alert = false,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  variant?: Variant;
  alert?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("kds-queue-section", VARIANT_CLASS[variant])}
      aria-labelledby={id ? `${id}-heading` : undefined}
      role={alert ? "alert" : undefined}
    >
      <header className="kds-queue-section__head">
        <h3 id={id ? `${id}-heading` : undefined} className="kds-queue-section__title">
          {title}
        </h3>
        {description ? (
          <p className="kds-queue-section__desc">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
