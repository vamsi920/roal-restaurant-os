import {
  areaPath,
  chartPoints,
  linePath,
  niceAxisMax,
} from "@/lib/overview/aggregate";
import type { OverviewDayPoint } from "@/lib/overview/types";

const W = 1000;
const H = 200;

function shortDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * 14-day calls (ember area) + orders (ink line). Lines are drawn in a
 * stretched SVG with non-scaling strokes; labels are HTML so they stay
 * readable at phone width.
 */
export function CallsChart({ series }: { series: OverviewDayPoint[] }) {
  const calls = series.map((p) => p.calls);
  const orders = series.map((p) => p.orders);
  const max = niceAxisMax(Math.max(0, ...calls, ...orders));
  const callPts = chartPoints(calls, { width: W, height: H, max });
  const orderPts = chartPoints(orders, { width: W, height: H, max });
  const totalCalls = calls.reduce((a, b) => a + b, 0);
  const totalOrders = orders.reduce((a, b) => a + b, 0);
  const last = series.length - 1;
  const ticks = [max, Math.round(max / 2), 0];

  return (
    <figure className="overview-chart m-0 min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-subtle">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-accent" aria-hidden /> Calls
          <span className="font-semibold tabular-nums text-ink">{totalCalls}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-3 rounded-full bg-ink/60" aria-hidden /> Orders
          <span className="font-semibold tabular-nums text-ink">{totalOrders}</span>
        </span>
      </div>

      <div className="flex min-w-0 gap-2">
        <div className="relative w-6 shrink-0 text-right text-[11px] tabular-nums text-subtle" style={{ height: 180 }} aria-hidden>
          {ticks.map((t, i) => (
            <span
              key={i}
              className="absolute right-0 -translate-y-1/2 leading-none"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: 180 }}>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
              role="img"
              aria-label={`Last ${series.length} days: ${totalCalls} calls and ${totalOrders} orders.`}
            >
              <defs>
                <linearGradient id="overview-calls-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map((f) => (
                <line
                  key={f}
                  x1={0}
                  x2={W}
                  y1={f * H}
                  y2={f * H}
                  stroke="rgb(var(--border))"
                  strokeDasharray={f === 1 ? undefined : "4 4"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {callPts.length > 1 ? (
                <>
                  <path d={areaPath(callPts, H)} fill="url(#overview-calls-fill)" />
                  <path
                    d={linePath(orderPts)}
                    fill="none"
                    stroke="rgb(var(--text-primary) / 0.55)"
                    strokeWidth={1.5}
                    strokeDasharray="5 4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={linePath(callPts)}
                    fill="none"
                    stroke="rgb(var(--accent))"
                    strokeWidth={2.25}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </>
              ) : null}
            </svg>
            {callPts.length > 0 ? (
              <span
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-accent shadow-sm"
                style={{
                  left: `${(callPts[last][0] / W) * 100}%`,
                  top: `${(callPts[last][1] / H) * 100}%`,
                }}
                aria-hidden
              />
            ) : null}
          </div>

          <div className="relative mt-2 h-4 text-[11px] text-subtle" aria-hidden>
            {series.map((p, i) => {
              if (i % 2 !== last % 2) return null;
              const edge = i === 0 ? "translate-x-0" : i === last ? "-translate-x-full" : "-translate-x-1/2";
              const mobileHidden = i !== 0 && i !== last && i % 4 !== last % 4;
              return (
                <span
                  key={p.date}
                  className={`absolute whitespace-nowrap ${edge} ${mobileHidden ? "hidden sm:inline" : ""}`}
                  style={{ left: `${last > 0 ? (i / last) * 100 : 0}%` }}
                >
                  {i === last ? "Today" : shortDay(p.date)}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>Calls and orders per day</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Calls</th>
            <th scope="col">Orders</th>
          </tr>
        </thead>
        <tbody>
          {series.map((p) => (
            <tr key={p.date}>
              <td>{shortDay(p.date)}</td>
              <td>{p.calls}</td>
              <td>{p.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
