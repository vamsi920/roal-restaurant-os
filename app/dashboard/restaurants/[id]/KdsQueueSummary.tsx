import { cn } from "@/lib/cn";

export type KdsQueueSummaryChip = {
  id: string;
  label: string;
  count: number;
  tone?: "live" | "ticket" | "kitchen" | "stuck" | "muted";
};

export function KdsQueueSummary({ chips }: { chips: KdsQueueSummaryChip[] }) {
  const visible = chips.filter((c) => c.count > 0);
  if (visible.length === 0) return null;

  return (
    <ul
      className="kds-queue-summary flex min-w-0 flex-wrap gap-2 px-3 py-2 sm:px-4"
      aria-label="Queue at a glance"
    >
      {visible.map((chip) => (
        <li key={chip.id}>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-caption font-medium tabular-nums",
              chip.tone === "live" && "bg-warning/15 text-amber-900",
              chip.tone === "ticket" && "bg-accent-soft text-accent",
              chip.tone === "kitchen" && "bg-elev text-ink",
              chip.tone === "stuck" && "bg-danger/10 text-danger",
              (!chip.tone || chip.tone === "muted") && "bg-elev text-muted"
            )}
          >
            {chip.tone === "live" ? (
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-warning" aria-hidden />
            ) : null}
            <span>{chip.label}</span>
            <span className="font-semibold">{chip.count}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
