"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { DraftOrderRow, PhoneOrderReceiptRow } from "@/lib/types";
import { cn } from "@/lib/cn";

function bootstrapKey(
  drafts: DraftOrderRow[],
  receipts: PhoneOrderReceiptRow[]
): string {
  const d = [...drafts]
    .map((r) => `${r.id}:${r.updated_at}:${r.status}`)
    .sort()
    .join("|");
  const r = [...receipts]
    .map((x) => `${x.id}:${x.created_at}`)
    .sort()
    .join("|");
  return `${d}__${r}`;
}

type Tab = "live" | "done";

type Props = {
  restaurantId: string;
  initialDraftOrders: DraftOrderRow[];
  initialReceipts: PhoneOrderReceiptRow[];
};

export function LiveOrdersPanel({
  restaurantId,
  initialDraftOrders,
  initialReceipts,
}: Props) {
  const [draftRows, setDraftRows] = useState<DraftOrderRow[]>(initialDraftOrders);
  const [receipts, setReceipts] =
    useState<PhoneOrderReceiptRow[]>(initialReceipts);
  const [tab, setTab] = useState<Tab>("live");
  const [refreshing, setRefreshing] = useState(false);
  /** Browser Realtime socket: degraded = fast HTTP poll until reconnect. */
  const [realtimeUi, setRealtimeUi] = useState<"connecting" | "live" | "degraded">(
    "connecting"
  );

  const draftsRef = useRef(initialDraftOrders);
  const receiptsRef = useRef(initialReceipts);
  draftsRef.current = initialDraftOrders;
  receiptsRef.current = initialReceipts;

  const serverKey = useMemo(
    () => bootstrapKey(initialDraftOrders, initialReceipts),
    [initialDraftOrders, initialReceipts]
  );

  useLayoutEffect(() => {
    setDraftRows(draftsRef.current);
    setReceipts(receiptsRef.current);
  }, [serverKey]);

  const fetchAll = useCallback(async () => {
    const supabase = getBrowserSupabase();
    const [dRes, rRes] = await Promise.all([
      supabase
        .from("draft_orders")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("phone_order_receipts")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(150),
    ]);
    if (!dRes.error && Array.isArray(dRes.data)) {
      setDraftRows(dRes.data as DraftOrderRow[]);
    }
    if (!rRes.error && Array.isArray(rRes.data)) {
      setReceipts(rRes.data as PhoneOrderReceiptRow[]);
    }
  }, [restaurantId]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    let cancelled = false;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let backoffAttempt = 0;
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;

    const stopPoll = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const startPoll = (ms: number) => {
      stopPoll();
      pollInterval = setInterval(() => {
        void fetchAll();
      }, ms);
    };

    const clearReconnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const teardownChannel = () => {
      if (activeChannel) {
        void supabase.removeChannel(activeChannel);
        activeChannel = null;
      }
    };

    const attach = () => {
      if (cancelled) return;
      teardownChannel();
      setRealtimeUi("connecting");
      startPoll(6000);

      const ch = supabase
        .channel(`orders-${restaurantId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "draft_orders",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as DraftOrderRow;
              setDraftRows((prev) =>
                prev.some((o) => o.id === row.id) ? prev : [row, ...prev]
              );
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new as DraftOrderRow;
              setDraftRows((prev) =>
                prev.map((o) => (o.id === row.id ? row : o))
              );
            } else if (payload.eventType === "DELETE") {
              const row = payload.old as DraftOrderRow;
              setDraftRows((prev) => prev.filter((o) => o.id !== row.id));
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "phone_order_receipts",
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const row = payload.new as PhoneOrderReceiptRow;
              setReceipts((prev) => {
                const rest = prev.filter((p) => p.session_id !== row.session_id);
                return [row, ...rest];
              });
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new as PhoneOrderReceiptRow;
              setReceipts((prev) =>
                prev.map((o) => (o.id === row.id ? row : o))
              );
            } else if (payload.eventType === "DELETE") {
              const row = payload.old as PhoneOrderReceiptRow;
              setReceipts((prev) => prev.filter((o) => o.id !== row.id));
            }
          }
        )
        .subscribe((status, err) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") {
            backoffAttempt = 0;
            setRealtimeUi("live");
            startPoll(28000);
            return;
          }
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT"
          ) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[LiveOrdersPanel] Realtime:", status, err);
            }
            setRealtimeUi("degraded");
            startPoll(6000);
            void fetchAll();
            teardownChannel();
            backoffAttempt += 1;
            const delay = Math.min(30_000, 1500 * 2 ** (backoffAttempt - 1));
            clearReconnect();
            reconnectTimer = setTimeout(() => {
              reconnectTimer = null;
              attach();
            }, delay);
          }
        });
      activeChannel = ch;
    };

    void fetchAll();
    attach();

    return () => {
      cancelled = true;
      clearReconnect();
      stopPoll();
      teardownChannel();
    };
  }, [restaurantId, fetchAll]);

  const liveCarts = useMemo(
    () =>
      [...draftRows]
        .filter((o) => o.status === "draft")
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
        ),
    [draftRows]
  );

  const doneSorted = useMemo(
    () =>
      [...receipts].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      ),
    [receipts]
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }

  const emptyLive = tab === "live" && liveCarts.length === 0;
  const emptyDone = tab === "done" && doneSorted.length === 0;

  return (
    <section className="glass-card overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:px-5 sm:py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Phone orders</h2>
          <p className="mt-0.5 text-xs text-muted">
            In-progress carts and finalized receipts for{" "}
            <span className="font-medium text-ink">this restaurant only</span>.
            Stored in Postgres; syncs over Realtime
            {realtimeUi === "degraded" && (
              <>
                {" "}
                <span className="text-warning">(using frequent refresh until live socket reconnects)</span>
              </>
            )}
            .
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={refreshing}
            className="inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-elev px-2.5 py-2 text-[11px] font-medium text-ink transition-colors hover:bg-card disabled:opacity-50 sm:w-auto sm:py-1.5"
          >
            <svg
              className={cn("h-3.5 w-3.5", refreshing && "animate-spin")}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M21 12a9 9 0 1 1-3-6.7" strokeLinecap="round" />
              <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {refreshing ? "Syncing…" : "Refresh"}
          </button>
          <span
            className={cn(
              "chip",
              realtimeUi === "degraded" && "border-warning/50 bg-warning/[0.08]"
            )}
            title={
              realtimeUi === "live"
                ? "Subscribed to Postgres changes"
                : realtimeUi === "connecting"
                  ? "Connecting to Realtime…"
                  : "Realtime unavailable — polling every 6s"
            }
          >
            {realtimeUi === "live" ? (
              <>
                <span className="pulse-dot" />
                Realtime
              </>
            ) : realtimeUi === "connecting" ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-subtle" />
                Connecting…
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-warning" />
                Polling 6s
              </>
            )}
          </span>
        </div>
      </div>

      <div className="flex border-b border-line px-2 pt-2 sm:px-3">
        <button
          type="button"
          onClick={() => setTab("live")}
          className={cn(
            "relative min-h-[44px] flex-1 rounded-t-lg px-2 py-2.5 text-xs font-medium transition-colors sm:px-3",
            tab === "live"
              ? "text-ink"
              : "text-muted hover:text-ink/80"
          )}
        >
          Live carts
          <span
            className={cn(
              "ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              tab === "live" ? "bg-warning/20 text-amber-900" : "bg-elev text-subtle"
            )}
          >
            {liveCarts.length}
          </span>
          {tab === "live" && (
            <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setTab("done")}
          className={cn(
            "relative min-h-[44px] flex-1 rounded-t-lg px-2 py-2.5 text-xs font-medium transition-colors sm:px-3",
            tab === "done"
              ? "text-ink"
              : "text-muted hover:text-ink/80"
          )}
        >
          Completed
          <span
            className={cn(
              "ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
              tab === "done" ? "bg-success/20 text-emerald-900" : "bg-elev text-subtle"
            )}
          >
            {doneSorted.length}
          </span>
          {tab === "done" && (
            <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent" />
          )}
        </button>
      </div>

      <div className="max-h-[min(55svh,440px)] overflow-y-auto overscroll-contain p-3 sm:max-h-[440px] sm:p-4">
        {tab === "live" && emptyLive && (
          <p className="py-10 text-center text-sm text-muted">
            No active voice carts. When a caller is mid-order,{" "}
            <code className="rounded bg-elev px-1 text-[11px]">sync_draft_order</code>{" "}
            appears here.
          </p>
        )}
        {tab === "done" && emptyDone && (
          <p className="py-10 text-center text-sm text-muted">
            No completed orders yet. Finalized calls are saved here permanently
            for this restaurant.
          </p>
        )}
        {tab === "live" && liveCarts.length > 0 && (
          <ul className="space-y-3">
            {liveCarts.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-warning/40 bg-warning/[0.06] p-4 shadow-sm"
              >
                <OrderCardHeader
                  badge="draft"
                  badgeClass="bg-warning/20 text-amber-900"
                  sessionId={o.session_id}
                />
                <CustomerLine name={o.customer_name} phone={o.customer_phone} />
                <OrderItemsList items={o.items} />
                <p className="mt-2 text-[10px] text-subtle">
                  Updated {new Date(o.updated_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
        {tab === "done" && doneSorted.length > 0 && (
          <ul className="space-y-3">
            {doneSorted.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-success/40 bg-success/[0.06] p-4 shadow-sm"
              >
                <OrderCardHeader
                  badge="done"
                  badgeClass="bg-success/20 text-emerald-900"
                  sessionId={o.session_id}
                />
                <CustomerLine name={o.customer_name} phone={o.customer_phone} />
                <OrderItemsList items={o.items} />
                <p className="mt-2 text-[10px] text-subtle">
                  Finalized {new Date(o.created_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function OrderCardHeader({
  badge,
  badgeClass,
  sessionId,
}: {
  badge: string;
  badgeClass: string;
  sessionId: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span
        className={cn(
          "rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
          badgeClass
        )}
      >
        {badge}
      </span>
      <span className="font-mono-tabular text-[11px] text-subtle">
        {sessionId.length > 14
          ? `${sessionId.slice(0, 12)}…`
          : sessionId}
      </span>
    </div>
  );
}

function CustomerLine({
  name,
  phone,
}: {
  name: string | null;
  phone: string | null;
}) {
  if (!name && !phone) return null;
  return (
    <p className="mt-2 text-xs text-muted">
      {[name, phone].filter(Boolean).join(" · ")}
    </p>
  );
}

function OrderItemsList({ items }: { items: unknown }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="mt-2 text-xs text-subtle">No line items</p>;
  }
  return (
    <ul className="mt-2 space-y-1 border-t border-line/60 pt-2">
      {items.map((raw, i) => {
        const line = raw as Record<string, unknown>;
        const name = typeof line.name === "string" ? line.name : "Item";
        const qty =
          typeof line.quantity === "number"
            ? line.quantity
            : typeof line.quantity === "string"
              ? line.quantity
              : 1;
        const cust = line.customizations;
        const custStr = Array.isArray(cust)
          ? cust.filter((x) => typeof x === "string").join(", ")
          : "";
        return (
          <li key={i} className="text-[13px] text-ink">
            <span className="font-mono-tabular text-muted">{qty}×</span> {name}
            {custStr ? (
              <span className="text-subtle"> — {custStr}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
