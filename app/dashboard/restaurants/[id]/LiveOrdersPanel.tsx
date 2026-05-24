"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { reportRealtimeDegraded } from "@/lib/notifications/report-realtime-degraded";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { DraftOrderRow, PhoneOrderReceiptRow } from "@/lib/types";
import {
  compareKitchenQueue,
  isQueuedKitchenStatus,
  isTerminalOrderStatus,
  isVoiceCartStatus,
  normalizeOrderStatus,
  ORDER_STATUS_LABELS,
  STATUS_BADGE_CLASS,
} from "@/lib/order-status";
import { cn } from "@/lib/cn";
import { formatSupabaseClientError } from "@/lib/dashboard/format-user-error";
import { KitchenOrderCard } from "./KitchenOrderCard";
import {
  OrderDetailModal,
  type OrderDetailSelection,
} from "./OrderDetailModal";
import {
  CustomerLine,
  OrderCardHeader,
  OrderItemsList,
} from "./order-card-parts";
import { useOrderStatusActions } from "./useOrderStatusActions";
import { mergeFetchedDraftOrders } from "@/lib/orders/merge-fetched-orders";
import type { OrderPricingSettings } from "@/lib/orders/pricing-settings";
import { LEGACY_CONFIRMED_STATUS } from "@/lib/order-status";
import type { DbItem, DbModifier } from "@/lib/types";

function normalizeDraftRow(row: DraftOrderRow): DraftOrderRow {
  const status =
    row.status === LEGACY_CONFIRMED_STATUS ? "new" : row.status;
  return {
    ...row,
    status,
    accepted_at: row.accepted_at ?? null,
    in_progress_at: row.in_progress_at ?? null,
    ready_at: row.ready_at ?? null,
    completed_at: row.completed_at ?? null,
    canceled_at: row.canceled_at ?? null,
  };
}

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

type Tab = "queue" | "live" | "done";

type Props = {
  restaurantId: string;
  restaurantName: string;
  menuItems: DbItem[];
  menuModifiers: DbModifier[];
  pricingSettings: OrderPricingSettings;
  initialDraftOrders: DraftOrderRow[];
  initialReceipts: PhoneOrderReceiptRow[];
  initialLoadError?: string | null;
};

function queueCardStyle(status: string) {
  const n = normalizeOrderStatus(status);
  switch (n) {
    case "new":
      return {
        border: "border-accent/40",
        bg: "bg-accent/[0.06]",
      };
    case "accepted":
      return {
        border: "border-accent/30",
        bg: "bg-card",
      };
    case "in_progress":
      return {
        border: "border-warning/40",
        bg: "bg-warning/[0.06]",
      };
    case "ready":
      return {
        border: "border-success/40",
        bg: "bg-success/[0.06]",
      };
    default:
      return {
        border: "border-line",
        bg: "bg-elev",
      };
  }
}

export function LiveOrdersPanel({
  restaurantId,
  restaurantName,
  menuItems,
  menuModifiers,
  pricingSettings,
  initialDraftOrders,
  initialReceipts,
  initialLoadError = null,
}: Props) {
  const [draftRows, setDraftRows] = useState<DraftOrderRow[]>(() =>
    initialDraftOrders.map(normalizeDraftRow)
  );
  const [receipts, setReceipts] =
    useState<PhoneOrderReceiptRow[]>(initialReceipts);
  const [syncError, setSyncError] = useState<string | null>(initialLoadError);
  const [tab, setTab] = useState<Tab>("queue");
  const [selection, setSelection] = useState<OrderDetailSelection | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeUi, setRealtimeUi] = useState<"connecting" | "live" | "degraded">(
    "connecting"
  );

  const { applyAction, pending, errors, clearError, mergeRealtimeRow } =
    useOrderStatusActions(restaurantId, setDraftRows);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const selectedDraftId =
    selection?.kind === "draft" ? selection.order.id : null;

  useEffect(() => {
    if (!selectedDraftId) return;
    const fresh = draftRows.find((o) => o.id === selectedDraftId);
    if (fresh) {
      setSelection((prev) =>
        prev?.kind === "draft" && prev.order.id === selectedDraftId
          ? { kind: "draft", order: fresh }
          : prev
      );
    }
  }, [draftRows, selectedDraftId]);

  const draftsRef = useRef(initialDraftOrders);
  const receiptsRef = useRef(initialReceipts);
  draftsRef.current = initialDraftOrders;
  receiptsRef.current = initialReceipts;

  const serverKey = useMemo(
    () => bootstrapKey(initialDraftOrders, initialReceipts),
    [initialDraftOrders, initialReceipts]
  );

  useLayoutEffect(() => {
    setDraftRows(draftsRef.current.map(normalizeDraftRow));
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
    const errMsg = dRes.error?.message ?? rRes.error?.message ?? null;
    if (errMsg) {
      setSyncError(formatSupabaseClientError(errMsg));
    } else {
      setSyncError(null);
    }
    if (!dRes.error && Array.isArray(dRes.data)) {
      const fetched = (dRes.data as DraftOrderRow[]).map(normalizeDraftRow);
      const pendingIds = new Set(Object.keys(pendingRef.current));
      setDraftRows((prev) =>
        mergeFetchedDraftOrders(prev, fetched, pendingIds)
      );
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
          (payload: RealtimePostgresChangesPayload<DraftOrderRow>) => {
            if (payload.eventType === "INSERT") {
              const row = normalizeDraftRow(payload.new as DraftOrderRow);
              if (row.restaurant_id !== restaurantId) return;
              setDraftRows((prev) =>
                prev.some((o) => o.id === row.id) ? prev : [row, ...prev]
              );
            } else if (payload.eventType === "UPDATE") {
              const row = normalizeDraftRow(payload.new as DraftOrderRow);
              if (row.restaurant_id !== restaurantId) return;
              if (!mergeRealtimeRow(row)) return;
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
          (payload: RealtimePostgresChangesPayload<PhoneOrderReceiptRow>) => {
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
        .subscribe((status: string, err?: Error) => {
          if (cancelled) return;
          if (status === "SUBSCRIBED") {
            backoffAttempt = 0;
            setRealtimeUi("live");
            startPoll(28000);
            return;
          }
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            if (process.env.NODE_ENV === "development") {
              console.warn("[LiveOrdersPanel] Realtime:", status, err);
            }
            setRealtimeUi("degraded");
            reportRealtimeDegraded({ restaurantId, restaurantName });
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

    function onVisible() {
      if (document.visibilityState === "visible") {
        void fetchAll();
      }
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      clearReconnect();
      stopPoll();
      teardownChannel();
    };
  }, [restaurantId, restaurantName, fetchAll, mergeRealtimeRow]);

  const kitchenQueue = useMemo(
    () =>
      [...draftRows]
        .filter((o) => isQueuedKitchenStatus(o.status))
        .sort((a, b) => {
          const byStatus = compareKitchenQueue(a.status, b.status);
          if (byStatus !== 0) return byStatus;
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        }),
    [draftRows]
  );

  const liveCarts = useMemo(
    () =>
      [...draftRows]
        .filter((o) => isVoiceCartStatus(o.status))
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
        ),
    [draftRows]
  );

  const terminalOrders = useMemo(
    () =>
      [...draftRows]
        .filter((o) => isTerminalOrderStatus(o.status))
        .sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
        ),
    [draftRows]
  );

  const receiptArchive = useMemo(() => {
    const terminalSessions = new Set(terminalOrders.map((o) => o.session_id));
    return [...receipts]
      .filter((r) => !terminalSessions.has(r.session_id))
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
  }, [receipts, terminalOrders]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await fetchAll();
    } finally {
      setRefreshing(false);
    }
  }

  const emptyQueue = tab === "queue" && kitchenQueue.length === 0;
  const emptyLive = tab === "live" && liveCarts.length === 0;
  const emptyDone =
    tab === "done" &&
    terminalOrders.length === 0 &&
    receiptArchive.length === 0;

  const modalPending =
    selection?.kind === "draft" ? pending[selection.order.id] ?? null : null;
  const modalError =
    selection?.kind === "draft" ? errors[selection.order.id] ?? null : null;

  return (
    <>
    <section className="kds-panel glass-card overflow-hidden">
      {syncError ? (
        <p
          className="border-b border-danger/25 bg-danger/5 px-4 py-2 text-xs text-danger sm:px-5"
          role="alert"
        >
          Orders could not be loaded. {syncError} Try Refresh or check your
          connection.
        </p>
      ) : null}
      <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:px-5 sm:py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Phone orders</h2>
          <p className="mt-0.5 text-xs text-muted">
            Kitchen queue, live voice carts, and completed orders. Updates via
            Realtime
            {realtimeUi === "degraded" && (
              <span className="text-warning">
                {" "}
                (polling every 6s until reconnect)
              </span>
            )}
            .
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => void onRefresh()}
            disabled={refreshing}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-elev px-2.5 py-2 text-[11px] font-medium text-ink transition-colors hover:bg-card disabled:opacity-50 sm:w-auto"
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
              <path
                d="M21 3v6h-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {refreshing ? "Syncing…" : "Refresh"}
          </button>
          <span
            className={cn(
              "chip",
              realtimeUi === "degraded" && "border-warning/50 bg-warning/[0.08]"
            )}
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

      <div className="kds-order-tabs">
        <TabButton
          active={tab === "queue"}
          onClick={() => setTab("queue")}
          label="Kitchen queue"
          count={kitchenQueue.length}
          accentWhenActive
        />
        <TabButton
          active={tab === "live"}
          onClick={() => setTab("live")}
          label="Live carts"
          count={liveCarts.length}
        />
        <TabButton
          active={tab === "done"}
          onClick={() => setTab("done")}
          label="Done"
          count={terminalOrders.length + receiptArchive.length}
          successWhenActive
        />
      </div>

      <div className="kds-order-body">
        {tab === "queue" && emptyQueue && (
          <KdsEmptyState title="Kitchen queue is empty">
            Finalized phone orders land here as{" "}
            <span className="font-medium text-ink">New</span> until you accept
            them.
          </KdsEmptyState>
        )}
        {tab === "live" && emptyLive && (
          <KdsEmptyState title="No live voice carts">
            In-progress phone orders appear here while the caller is still on the
            line. Connect the voice agent below to start taking calls.
          </KdsEmptyState>
        )}
        {tab === "done" && emptyDone && (
          <KdsEmptyState title="No completed orders yet">
            Completed and canceled tickets show up here for quick reference.
          </KdsEmptyState>
        )}

        {tab === "queue" && kitchenQueue.length > 0 && (
          <ul className="space-y-3">
            {kitchenQueue.map((o) => {
              const style = queueCardStyle(o.status);
              return (
                <KitchenOrderCard
                  key={o.id}
                  order={o}
                  pendingAction={pending[o.id] ?? null}
                  error={errors[o.id] ?? null}
                  onDismissError={() => clearError(o.id)}
                  onAction={(action) => void applyAction(o, action)}
                  onViewDetails={() =>
                    setSelection({ kind: "draft", order: o })
                  }
                  menuItems={menuItems}
                  menuModifiers={menuModifiers}
                  pricingSettings={pricingSettings}
                  borderClass={style.border}
                  bgClass={style.bg}
                />
              );
            })}
          </ul>
        )}

        {tab === "live" && liveCarts.length > 0 && (
          <ul className="space-y-3">
            {liveCarts.map((o) => (
              <li
                key={o.id}
                className="rounded-xl border border-warning/40 bg-warning/[0.06] p-4 shadow-sm"
              >
                <OrderCardHeader
                  badge={ORDER_STATUS_LABELS.draft}
                  badgeClass={STATUS_BADGE_CLASS.draft}
                  sessionId={o.session_id}
                />
                <CustomerLine
                  name={o.customer_name}
                  phone={o.customer_phone}
                />
                <OrderItemsList items={o.items} />
                <button
                  type="button"
                  onClick={() =>
                    setSelection({ kind: "draft", order: o })
                  }
                  className="mt-3 min-h-10 w-full rounded-lg border border-line bg-elev text-xs font-semibold text-ink hover:bg-card sm:w-auto sm:px-4"
                >
                  Details
                </button>
                <p className="mt-2 text-[10px] text-subtle">
                  Updated {new Date(o.updated_at).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}

        {tab === "done" && (terminalOrders.length > 0 || receiptArchive.length > 0) && (
          <div className="space-y-6">
            {terminalOrders.length > 0 ? (
              <ul className="space-y-3">
                {terminalOrders.map((o) => {
                  const n = normalizeOrderStatus(o.status);
                  const isCanceled = n === "canceled";
                  return (
                    <KitchenOrderCard
                      key={o.id}
                      order={o}
                      pendingAction={null}
                      error={null}
                      onDismissError={() => {}}
                      onAction={() => {}}
                      onViewDetails={() =>
                        setSelection({ kind: "draft", order: o })
                      }
                      menuItems={menuItems}
                      menuModifiers={menuModifiers}
                      pricingSettings={pricingSettings}
                      borderClass={
                        isCanceled
                          ? "border-line"
                          : "border-success/40"
                      }
                      bgClass={
                        isCanceled
                          ? "bg-elev"
                          : "bg-success/[0.06]"
                      }
                    />
                  );
                })}
              </ul>
            ) : null}
            {receiptArchive.length > 0 ? (
              <div>
                <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-subtle">
                  Receipt archive
                </h3>
                <ul className="space-y-3">
                  {receiptArchive.map((o) => (
                    <li
                      key={o.id}
                      className="rounded-xl border border-line bg-elev p-4 shadow-sm"
                    >
                      <OrderCardHeader
                        badge="Receipt"
                        badgeClass="bg-elev text-muted"
                        sessionId={o.session_id}
                      />
                      <CustomerLine
                        name={o.customer_name}
                        phone={o.customer_phone}
                      />
                      <OrderItemsList items={o.items} />
                      <button
                        type="button"
                        onClick={() =>
                          setSelection({ kind: "receipt", receipt: o })
                        }
                        className="mt-3 min-h-10 rounded-lg border border-line bg-card px-4 text-xs font-semibold text-ink hover:bg-elev"
                      >
                        Details
                      </button>
                      <p className="mt-2 text-[10px] text-subtle">
                        Finalized {new Date(o.created_at).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>

    <OrderDetailModal
      open={!!selection}
      selection={selection}
      onClose={() => setSelection(null)}
      restaurantName={restaurantName}
      menuItems={menuItems}
      menuModifiers={menuModifiers}
      pricingSettings={pricingSettings}
      pendingAction={modalPending}
      actionError={modalError}
      onDismissError={
        selection?.kind === "draft"
          ? () => clearError(selection.order.id)
          : undefined
      }
      onAction={
        selection?.kind === "draft"
          ? (action) => void applyAction(selection.order, action)
          : undefined
      }
    />
    </>
  );
}

function KdsEmptyState({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="kds-empty-state">
      <p className="kds-empty-state__title">{title}</p>
      <p className="kds-empty-state__body">{children}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  accentWhenActive,
  successWhenActive,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  accentWhenActive?: boolean;
  successWhenActive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative min-h-[44px] shrink-0 rounded-t-lg px-2 py-2.5 text-[11px] font-medium transition-colors sm:min-w-[6.5rem] sm:px-3 sm:text-xs",
        active ? "text-ink" : "text-muted hover:text-ink/80"
      )}
    >
      {label}
      <span
        className={cn(
          "ml-1 rounded-md px-1 py-0.5 text-[10px] font-semibold tabular-nums",
          active && accentWhenActive && "bg-accent-soft text-accent",
          active && successWhenActive && "bg-success/20 text-emerald-900",
          active && !accentWhenActive && !successWhenActive && "bg-elev text-subtle",
          !active && "bg-elev text-subtle"
        )}
      >
        {count}
      </span>
      {active && (
        <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-accent sm:inset-x-2" />
      )}
    </button>
  );
}
