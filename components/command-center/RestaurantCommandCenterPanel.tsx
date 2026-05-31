import type { ReactNode } from "react";
import { KdsEmptyStatePanel } from "@/components/dashboard/kds-workspace-states";
import type {
  CommandCenterCallRow,
  CommandCenterCompletedOrder,
  RestaurantCommandCenterSnapshot,
} from "@/lib/command-center/types";

function formatWhen(iso: string): string {
  const ms = new Date(iso).getTime();
  if (Number.isNaN(ms)) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(ms);
}

function formatCaller(phone: string | null, name: string | null): string {
  if (name?.trim()) return name.trim();
  if (phone?.trim()) return phone.trim();
  return "Unknown caller";
}

function CallRow({ row }: { row: CommandCenterCallRow }) {
  return (
    <li className="rounded-lg border border-line bg-elev/30 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-ink">
          {formatCaller(row.callerPhone, null)}
        </span>
        <time className="text-xs text-muted" dateTime={row.lastActivityAt}>
          {formatWhen(row.lastActivityAt)}
        </time>
      </div>
      <p className="mt-1 text-xs text-muted">
        {row.status === "active" ? "In progress" : row.outcome.replace(/_/g, " ")}
        {row.lineCount > 0 ? ` · ${row.lineCount} item${row.lineCount === 1 ? "" : "s"}` : null}
        {row.toolErrorCount > 0
          ? ` · ${row.toolErrorCount} tool error${row.toolErrorCount === 1 ? "" : "s"}`
          : null}
      </p>
      {row.handoffSignals.length > 0 ? (
        <p className="mt-1 text-xs text-amber-900">
          Handoff: {row.handoffSignals.join(", ")}
        </p>
      ) : null}
    </li>
  );
}

function CompletedOrderRow({ order }: { order: CommandCenterCompletedOrder }) {
  return (
    <li className="rounded-lg border border-line bg-elev/30 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-ink">
          {formatCaller(order.callerPhone, order.customerName)}
        </span>
        <time className="text-xs text-muted" dateTime={order.completedAt}>
          {formatWhen(order.completedAt)}
        </time>
      </div>
      <p className="mt-1 text-xs text-muted">
        {order.lineCount > 0
          ? `${order.lineCount} item${order.lineCount === 1 ? "" : "s"}`
          : "Receipt recorded"}
      </p>
    </li>
  );
}

function Bucket({
  title,
  description,
  count,
  emptyTitle,
  emptyBody,
  children,
}: {
  title: string;
  description: string;
  count: number;
  emptyTitle: string;
  emptyBody: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-line bg-card p-4 shadow-sm">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-ink">
          {title}
          <span className="ml-2 font-normal text-muted">({count})</span>
        </h3>
        <p className="mt-1 text-xs text-muted">{description}</p>
      </header>
      {count === 0 ? (
        <KdsEmptyStatePanel title={emptyTitle} tone="calm" icon="orders">
          {emptyBody}
        </KdsEmptyStatePanel>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </section>
  );
}

function CompactOutcomesList({
  snapshot,
}: {
  snapshot: RestaurantCommandCenterSnapshot;
}) {
  type Row =
    | { key: string; kind: "active" | "failed" | "handoff" | "unknown"; at: string; label: string; detail: string }
    | { key: string; kind: "completed"; at: string; label: string; detail: string };

  const rows: Row[] = [
    ...snapshot.activeCalls.map((row) => ({
      key: `active:${row.sessionId}`,
      kind: "active" as const,
      at: row.lastActivityAt,
      label: formatCaller(row.callerPhone, null),
      detail:
        row.status === "active"
          ? "In progress"
          : row.outcome.replace(/_/g, " "),
    })),
    ...snapshot.completedOrders.map((order) => ({
      key: `completed:${order.sessionId}`,
      kind: "completed" as const,
      at: order.completedAt,
      label: formatCaller(order.callerPhone, order.customerName),
      detail:
        order.lineCount > 0
          ? `${order.lineCount} item${order.lineCount === 1 ? "" : "s"}`
          : "Receipt recorded",
    })),
    ...snapshot.failedCalls.map((row) => ({
      key: `failed:${row.sessionId}`,
      kind: "failed" as const,
      at: row.lastActivityAt,
      label: formatCaller(row.callerPhone, null),
      detail: row.outcome.replace(/_/g, " "),
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  if (rows.length === 0) {
    return (
      <KdsEmptyStatePanel title="No recent outcomes" tone="calm" icon="orders">
        Calls and completed phone orders appear here from real draft and receipt
        data.
      </KdsEmptyStatePanel>
    );
  }

  return (
    <ul className="command-center__compact-list space-y-2">
      {rows.map((row) => (
        <li
          key={row.key}
          className="command-center__compact-row rounded-lg border border-line bg-elev/30 px-3 py-2 text-sm"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-medium text-ink">{row.label}</span>
            <time className="text-xs text-muted" dateTime={row.at}>
              {formatWhen(row.at)}
            </time>
          </div>
          <p className="mt-1 text-xs text-muted">
            {row.kind === "completed" ? "Completed order" : "Call"} · {row.detail}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function RestaurantCommandCenterPanel({
  snapshot,
  compact = false,
}: {
  snapshot: RestaurantCommandCenterSnapshot;
  compact?: boolean;
}) {
  const rangeLabel = `${formatWhen(snapshot.rangeSince)} – ${formatWhen(snapshot.rangeUntil)}`;

  if (compact) {
    const { counts } = snapshot;
    return (
      <section
        className="command-center command-center--compact min-w-0 rounded-xl border border-line bg-card p-4 shadow-sm"
        aria-labelledby="command-center-heading"
      >
        <header>
          <h2
            id="command-center-heading"
            className="text-sm font-semibold text-ink"
          >
            Recent outcomes
          </h2>
          <p className="mt-1 text-xs text-muted">
            Active {counts.active} · Completed {counts.completed} · Failed{" "}
            {counts.failed} · Window {rangeLabel}
          </p>
        </header>
        <div className="mt-3">
          <CompactOutcomesList snapshot={snapshot} />
        </div>
      </section>
    );
  }

  return (
    <section
      className="command-center space-y-4"
      aria-labelledby="command-center-heading"
    >
      <header>
        <h2
          id="command-center-heading"
          className="text-lg font-semibold tracking-tight text-ink"
        >
          Command center
        </h2>
        <p className="mt-1 text-sm text-muted">
          Live calls, completed phone orders, and outcomes from drafts, receipts,
          and usage events. Window: {rangeLabel}.
        </p>
        {snapshot.isEmpty ? (
          <p className="mt-2 text-sm text-muted" role="status">
            No call or order activity in this window yet. Counts reflect real
            data only — nothing is estimated.
          </p>
        ) : null}
      </header>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Bucket
          title="Active calls"
          description="Open drafts or recent tool/voice activity."
          count={snapshot.counts.active}
          emptyTitle="No active calls"
          emptyBody="Calls appear when a guest is on the line or a draft order was updated recently."
        >
          {snapshot.activeCalls.map((row) => (
            <CallRow key={row.sessionId} row={row} />
          ))}
        </Bucket>

        <Bucket
          title="Completed orders"
          description="Phone orders with a saved receipt."
          count={snapshot.counts.completed}
          emptyTitle="No completed orders"
          emptyBody="Completed orders show up after a receipt is saved for the call."
        >
          {snapshot.completedOrders.map((order) => (
            <CompletedOrderRow key={order.sessionId} order={order} />
          ))}
        </Bucket>

        <Bucket
          title="Failed"
          description="Canceled or abandoned carts, or tool errors during the call."
          count={snapshot.counts.failed}
          emptyTitle="No failed calls"
          emptyBody="Failures are listed when a cart is canceled, abandoned, or a tool returns an error."
        >
          {snapshot.failedCalls.map((row) => (
            <CallRow key={row.sessionId} row={row} />
          ))}
        </Bucket>

        <Bucket
          title="Handoff"
          description="Calls where transcript metadata signals staff escalation."
          count={snapshot.counts.handoff}
          emptyTitle="No handoffs recorded"
          emptyBody="Handoffs appear when call metadata includes escalation or handoff signals."
        >
          {snapshot.handoffCalls.map((row) => (
            <CallRow key={row.sessionId} row={row} />
          ))}
        </Bucket>

        <Bucket
          title="Unknown"
          description="Ended calls without a receipt or a clearer outcome."
          count={snapshot.counts.unknown}
          emptyTitle="No unknown outcomes"
          emptyBody="Unknown calls ended without a receipt, handoff signal, or failure classification."
        >
          {snapshot.unknownCalls.map((row) => (
            <CallRow key={row.sessionId} row={row} />
          ))}
        </Bucket>
      </div>
    </section>
  );
}
