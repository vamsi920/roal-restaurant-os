import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PreviewFrame({
  children,
  className,
  label,
  embedded,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
  /** Skip poster panel chrome when parent already provides glass frame. */
  embedded?: boolean;
}) {
  if (embedded) {
    return (
      <div className={cn("min-w-0 overflow-hidden", className)} aria-hidden>
        {label ? (
          <p className="mb-3 text-micro font-medium uppercase tracking-[0.14em] text-subtle">
            {label}
          </p>
        ) : null}
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "landing-panel min-w-0 overflow-hidden",
        className
      )}
      aria-hidden
    >
      {label ? (
        <p className="mb-3 text-micro font-medium uppercase tracking-[0.14em] text-subtle">
          {label}
        </p>
      ) : null}
      {children}
    </div>
  );
}

export function RoalMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-4 w-4 text-accent", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" />
      <path d="M4 14h6v6H4z" />
      <path d="M14 14h6v6h-6z" />
    </svg>
  );
}

export function formatPrice(n: number | null) {
  if (n == null) return "—";
  return n.toFixed(2);
}
