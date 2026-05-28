import type { LandingOrderLine } from "@/lib/landing-demo-data";
import type { LandingPreviewData } from "@/lib/landing-demo-data";
import { cn } from "@/lib/cn";

function OrderLines({ items }: { items: LandingOrderLine[] }) {
  if (items.length === 0) {
    return <p className="mt-2 text-xs text-subtle">No line items</p>;
  }
  return (
    <ul className="mt-2 space-y-1 border-t border-line/60 pt-2">
      {items.map((line, i) => {
        const cust = line.customizations?.join(", ");
        return (
          <li key={i} className="break-words text-[12px] text-ink sm:text-[13px]">
            <span className="font-mono tabular-nums text-muted">{line.quantity}×</span>{" "}
            {line.name}
            {cust ? <span className="text-subtle"> — {cust}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function PhoneOrdersPreview({
  data,
  tone = "default",
}: {
  data: LandingPreviewData;
  tone?: "default" | "glass";
}) {
  const glass = tone === "glass";
  const live = data.liveDraft;
  const done = data.completedReceipt;
  const liveCount = live ? 1 : 0;
  const doneCount = done ? 1 : 0;

  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden",
        glass ? "public-demo-kds-panel" : "glass-card"
      )}
    >
      <div className="border-b border-line px-3 py-2.5 sm:px-4 sm:py-3">
        <h3 className="text-sm font-semibold text-ink">Phone orders</h3>
        <p className="mt-0.5 text-pretty text-xs text-muted">
          In-progress carts and finalized receipts for this restaurant.
        </p>
      </div>

      <div className="flex border-b border-line px-2 pt-2">
        <div className="relative min-h-[40px] flex-1 rounded-t-lg px-2 py-2 text-xs font-medium text-ink">
          Live carts
          <span
            className={cn(
              "ml-1.5 rounded-md px-1.5 py-0.5 text-caption font-semibold tabular-nums",
              glass
                ? "bg-[rgb(var(--public-accent-lavender)/0.18)] text-[rgb(var(--public-ink))]"
                : "bg-warning/20 text-amber-900"
            )}
          >
            {liveCount}
          </span>
          <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />
        </div>
        <div className="relative min-h-[40px] flex-1 rounded-t-lg px-2 py-2 text-xs font-medium text-muted">
          Completed
          <span className="ml-1.5 rounded-md bg-elev px-1.5 py-0.5 text-caption font-semibold tabular-nums text-subtle">
            {doneCount}
          </span>
        </div>
      </div>

      <div className="max-h-[240px] overflow-y-auto overscroll-contain p-3 sm:max-h-[280px] sm:p-4">
        {live && (
          <div
            className={cn(
              "rounded-xl border p-3 sm:p-4",
              glass
                ? "border-[rgb(var(--public-accent-lavender)/0.35)] bg-[rgb(var(--public-accent-lavender)/0.08)]"
                : "border-warning/40 bg-warning/[0.06]"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={cn(
                  "rounded-md px-2 py-0.5 text-caption font-semibold uppercase tracking-wider",
                  glass
                    ? "bg-[rgb(var(--public-accent-lavender)/0.2)] text-[rgb(var(--public-ink))]"
                    : "bg-warning/20 text-amber-900"
                )}
              >
                draft
              </span>
              <span className="max-w-[50%] truncate font-mono text-caption tabular-nums text-subtle">
                {live.session_id.length > 14
                  ? `${live.session_id.slice(0, 12)}…`
                  : live.session_id}
              </span>
            </div>
            {(live.customer_name || live.customer_phone) && (
              <p className="mt-2 break-words text-xs text-muted">
                {[live.customer_name, live.customer_phone].filter(Boolean).join(" · ")}
              </p>
            )}
            <OrderLines items={live.items} />
          </div>
        )}
        {done && (
          <div
            className={cn(
              "rounded-xl border border-success/40 bg-success/[0.06] p-3 sm:p-4",
              live && "mt-3"
            )}
          >
            <span className="rounded-md bg-success/20 px-2 py-0.5 text-caption font-semibold uppercase tracking-wider text-emerald-900">
              done
            </span>
            {done.customer_name && (
              <p className="mt-2 break-words text-xs text-muted">{done.customer_name}</p>
            )}
            <OrderLines items={done.items} />
            <p className="mt-2 text-caption text-subtle">
              Finalized{" "}
              {new Date(done.created_at).toLocaleString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                timeZone: "America/Chicago",
              })}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
