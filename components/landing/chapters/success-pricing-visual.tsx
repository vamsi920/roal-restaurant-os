import { PublicCtaActions } from "@/components/landing/public";
import { SUCCESS_PRICING_DEMO } from "@/lib/landing/success-pricing-demo";
import { cn } from "@/lib/cn";

export function SuccessPricingVisual() {
  const v = SUCCESS_PRICING_DEMO.visual;
  const maxCount = Math.max(v.callAttempts, v.confirmedOrders);
  const callPct = (v.callAttempts / maxCount) * 100;
  const orderPct = (v.confirmedOrders / maxCount) * 100;

  return (
    <div
      className="success-pricing-visual glass-card overflow-hidden"
      role="group"
      aria-label="Illustrative success pricing: call attempts versus confirmed orders, sample invoice, and staff comparison"
    >
      <div className="border-b border-line bg-elev/50 px-4 py-3 sm:px-6">
        <p className="text-sm font-semibold text-ink">Success-based billing preview</p>
        <p className="text-[11px] text-muted">{v.periodLabel} · not a live invoice</p>
      </div>

      <div className="grid min-w-0 gap-4 p-4 sm:gap-5 sm:p-6 lg:grid-cols-12">
        <AttemptsVsOrdersPanel
          callAttempts={v.callAttempts}
          confirmedOrders={v.confirmedOrders}
          callPct={callPct}
          orderPct={orderPct}
          className="lg:col-span-5"
        />

        <InvoicePanel invoice={v.invoice} className="lg:col-span-4" />

        <StaffComparePanel compare={v.staffCompare} className="lg:col-span-3" />
      </div>

      <div className="success-pricing-visual__footer flex flex-col gap-3 border-t border-line px-4 py-4 sm:px-6">
        <p className="max-w-md text-pretty text-xs leading-relaxed text-muted">
          Pilots define per-order terms before go-live. No homepage rate card—just alignment on
          what counts as a successful pickup.
        </p>
        <PublicCtaActions
          actions={[
            { ...v.pilotCta.primary, variant: "primary" },
            { ...v.pilotCta.secondary, variant: "ghost" },
          ]}
        />
      </div>
    </div>
  );
}

function AttemptsVsOrdersPanel({
  callAttempts,
  confirmedOrders,
  callPct,
  orderPct,
  className,
}: {
  callAttempts: number;
  confirmedOrders: number;
  callPct: number;
  orderPct: number;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "success-pricing-bars rounded-xl border border-line bg-card/80 p-4 sm:p-5",
        className
      )}
      aria-label="Call attempts compared to confirmed orders"
    >
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle">
        Volume vs billable
      </h3>
      <p className="mt-1 text-pretty text-xs text-muted">
        Many rings; fewer orders that reach your kitchen screen.
      </p>

      <ul className="mt-5 space-y-4">
        <li>
          <div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-2">
            <span className="min-w-0 text-pretty text-sm font-medium text-ink">
              Call attempts <span className="font-normal text-subtle">(example)</span>
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-muted">
              {callAttempts}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-elev">
            <div
              className="success-pricing-bar-call h-full rounded-full bg-subtle/80"
              style={{ width: `${callPct}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] text-subtle">Not metered on your success bill</p>
        </li>
        <li>
          <div className="mb-1.5 flex min-w-0 items-baseline justify-between gap-2">
            <span className="min-w-0 text-pretty text-sm font-medium text-ink">
              Confirmed pickup orders <span className="font-normal text-subtle">(example)</span>
            </span>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-success">
              {confirmedOrders}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-elev">
            <div
              className="success-pricing-bar-orders h-full rounded-full bg-success/70"
              style={{ width: `${orderPct}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-medium text-success">What success pricing tracks</p>
        </li>
      </ul>
    </section>
  );
}

function InvoicePanel({
  invoice,
  className,
}: {
  invoice: typeof SUCCESS_PRICING_DEMO.visual.invoice;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "success-pricing-invoice rounded-xl border border-line bg-elev/60 p-4 sm:p-5",
        className
      )}
      aria-label="Sample pilot invoice"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{invoice.title}</h3>
          <p className="text-[10px] text-muted">{invoice.period}</p>
        </div>
        <span className="rounded-md border border-line bg-card px-2 py-0.5 font-mono text-[9px] text-subtle">
          SAMPLE
        </span>
      </div>

      <ul className="mt-4 space-y-3 border-t border-line pt-3">
        {invoice.lines.map((line) => (
          <li
            key={line.label}
            className={cn(
              "rounded-lg px-2 py-2",
              "highlight" in line && line.highlight && "bg-success/[0.07] ring-1 ring-success/20"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink">{line.label}</p>
                <p className="text-[10px] text-muted">{line.detail}</p>
                {"quantity" in line && line.quantity != null ? (
                  <p className="mt-0.5 font-mono text-[10px] tabular-nums text-subtle">
                    Qty {line.quantity}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-right text-[10px] font-medium text-ink">
                {line.amount}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 border-t border-dashed border-line pt-3 text-[10px] leading-relaxed text-muted">
        {invoice.excludedNote}
      </p>
    </section>
  );
}

function StaffComparePanel({
  compare,
  className,
}: {
  compare: typeof SUCCESS_PRICING_DEMO.visual.staffCompare;
  className?: string;
}) {
  return (
    <section
      className={cn("flex min-w-0 flex-col gap-3", className)}
      aria-label="Phone staff hiring compared to success pricing model"
    >
      <CompareCard title={compare.traditional.title} points={compare.traditional.points} tone="muted" />
      <CompareCard title={compare.roal.title} points={compare.roal.points} tone="accent" />
      <p className="text-[10px] leading-relaxed text-subtle">{compare.disclaimer}</p>
    </section>
  );
}

function CompareCard({
  title,
  points,
  tone,
}: {
  title: string;
  points: readonly string[];
  tone: "muted" | "accent";
}) {
  return (
    <div
      className={cn(
        "flex-1 rounded-xl border p-3 sm:p-4",
        tone === "accent"
          ? "border-accent/25 bg-accent-soft/40"
          : "border-line bg-card/70"
      )}
    >
      <h4 className="text-xs font-semibold text-ink">{title}</h4>
      <ul className="mt-2 space-y-1.5">
        {points.map((p) => (
          <li key={p} className="text-[11px] leading-snug text-muted">
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
